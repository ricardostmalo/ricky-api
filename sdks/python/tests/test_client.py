import asyncio
import json
import re
import time

import httpx
import pytest
import respx

from getricky import AsyncRicky, Ricky, RickyConnectionError, RickyError

API_KEY = "rky_live_test"
BASE = "https://getricky.ai/api/v1"
CONVERSATION = "5b0c3f1e-8d2a-4e7b-9c61-2f4a8e9d1b37"
SEND = {
    "id": "0e9a1c42-7f3b-4d58-a6e2-91c4b7d3f805",
    "conversation_id": CONVERSATION,
    "status": "queued",
    "message_id": None,
    "failure_reason": None,
    "created_at": "2026-10-14T15:30:00.000Z",
}
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")


def api_error(status, code, retry_after=None, **extra):
    headers = {"Retry-After": retry_after} if retry_after is not None else {}
    body = {"error": {"code": code, "message": f"{code} happened", "request_id": "req_1", **extra}}
    return httpx.Response(status, json=body, headers=headers)


@pytest.fixture
def ricky():
    with Ricky(API_KEY) as client:
        yield client


@respx.mock
def test_sends_the_key_as_a_bearer_token_to_the_default_base_url(ricky):
    route = respx.get(f"{BASE}/channels").respond(json={"data": [], "next_cursor": None})

    assert ricky.list_channels() == {"data": [], "next_cursor": None}
    assert route.calls.last.request.headers["authorization"] == f"Bearer {API_KEY}"


@respx.mock
def test_uses_a_custom_base_url_and_encodes_path_parameters():
    route = respx.get("http://localhost:3000/api/v1/sends/a%2Fb").respond(json={"data": SEND})

    with Ricky(API_KEY, base_url="http://localhost:3000/api/v1/") as client:
        assert client.get_send("a/b")["data"]["status"] == "queued"
    assert route.called


def test_reads_the_key_from_the_environment(monkeypatch):
    monkeypatch.delenv("RICKY_API_KEY", raising=False)
    with pytest.raises(ValueError, match="RICKY_API_KEY"):
        Ricky()
    monkeypatch.setenv("RICKY_API_KEY", API_KEY)
    Ricky().close()


@respx.mock
def test_adds_a_random_idempotency_key_to_writes_that_accept_one(ricky):
    route = respx.post(f"{BASE}/conversations").respond(202, json={"data": SEND})
    body = {"channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f", "phone": "+50760001234", "template": {"id": "1"}}

    ricky.start_conversation(body)
    ricky.start_conversation(body)

    keys = [call.request.headers["idempotency-key"] for call in route.calls]
    assert UUID.match(keys[0]) and keys[0] != keys[1]
    assert json.loads(route.calls[0].request.content) == body


@respx.mock
def test_keeps_the_idempotency_key_the_caller_passes(ricky):
    route = respx.post(f"{BASE}/conversations/{CONVERSATION}/messages").respond(202, json={"data": SEND})

    ricky.send_message(CONVERSATION, {"type": "text", "text": "Hola"}, idempotency_key="order-10482-ready")

    assert route.calls.last.request.headers["idempotency-key"] == "order-10482-ready"


@respx.mock
def test_sends_no_idempotency_key_to_operations_that_do_not_take_one(ricky):
    route = respx.post(f"{BASE}/webhooks").respond(201, json={"data": {}})

    ricky.create_webhook({"url": "https://example.com/hook", "event_types": ["message.received"]})

    assert "idempotency-key" not in route.calls.last.request.headers


@respx.mock
def test_raises_a_ricky_error_with_code_status_param_and_request_id(ricky):
    respx.get(f"{BASE}/contacts/x").mock(return_value=api_error(400, "invalid_input", param="phone"))

    with pytest.raises(RickyError) as raised:
        ricky.get_contact("x")

    error = raised.value
    assert (error.status, error.code, error.param, error.request_id) == (400, "invalid_input", "phone", "req_1")
    assert str(error) == "invalid_input happened"


@respx.mock
def test_a_non_json_error_has_no_code_and_the_request_id_header():
    respx.get(f"{BASE}/tags").respond(502, text="Bad gateway", headers={"X-Request-Id": "req_2"})

    with Ricky(API_KEY, max_retries=0) as client, pytest.raises(RickyError) as raised:
        client.list_tags()

    assert (raised.value.status, raised.value.code, raised.value.request_id) == (502, None, "req_2")


@respx.mock
def test_retries_a_read_after_429_waiting_for_retry_after(ricky):
    route = respx.get(f"{BASE}/members").mock(
        side_effect=[
            api_error(429, "rate_limited", retry_after="1"),
            httpx.Response(200, json={"data": [], "next_cursor": None}),
        ]
    )

    started = time.monotonic()
    assert ricky.list_members()["data"] == []
    assert route.call_count == 2
    assert time.monotonic() - started >= 0.95


@respx.mock
def test_retries_a_keyed_write_after_503_with_the_same_key_and_body(ricky):
    route = respx.post(f"{BASE}/conversations/{CONVERSATION}/messages").mock(
        side_effect=[api_error(503, "unavailable", retry_after="0"), httpx.Response(202, json={"data": SEND})]
    )

    assert ricky.send_message(CONVERSATION, {"type": "text", "text": "Hola"})["data"]["id"] == SEND["id"]

    first, second = (call.request for call in route.calls)
    assert first.headers["idempotency-key"] == second.headers["idempotency-key"]
    assert json.loads(second.content) == {"type": "text", "text": "Hola"}


@respx.mock
def test_never_retries_a_write_without_an_idempotency_key(ricky):
    route = respx.post(f"{BASE}/webhooks").mock(return_value=api_error(429, "rate_limited", retry_after="0"))

    with pytest.raises(RickyError) as raised:
        ricky.create_webhook({"url": "https://example.com", "event_types": ["message.received"]})

    assert raised.value.code == "rate_limited"
    assert route.call_count == 1


@respx.mock
def test_gives_up_after_max_retries_and_raises_the_last_error(ricky):
    route = respx.get(f"{BASE}/templates").mock(return_value=api_error(500, "internal_error", retry_after="0"))

    with pytest.raises(RickyError, match="internal_error happened"):
        ricky.list_templates()

    assert route.call_count == 3


@respx.mock
def test_wraps_a_network_failure_after_retrying():
    route = respx.get(f"{BASE}/channels").mock(side_effect=httpx.ConnectError("refused"))

    with Ricky(API_KEY, max_retries=1) as client, pytest.raises(RickyConnectionError):
        client.list_channels()

    assert route.call_count == 2


@respx.mock
def test_paginates_items_passing_next_cursor_back_as_cursor(ricky):
    route = respx.get(f"{BASE}/contacts").mock(
        side_effect=[
            httpx.Response(200, json={"data": [{"id": "a"}, {"id": "b"}], "next_cursor": "c1"}),
            httpx.Response(200, json={"data": [{"id": "c"}], "next_cursor": None}),
        ]
    )

    assert [contact["id"] for contact in ricky.paginate(ricky.list_contacts, page_size=2)] == ["a", "b", "c"]

    first, second = (call.request.url.params for call in route.calls)
    assert "cursor" not in first and first["page_size"] == "2"
    assert second["cursor"] == "c1" and second["page_size"] == "2"


@respx.mock
def test_paginates_pages_of_an_operation_with_path_parameters(ricky):
    respx.get(f"{BASE}/conversations/{CONVERSATION}/messages").mock(
        side_effect=[
            httpx.Response(200, json={"data": [{"id": "m1"}], "next_cursor": "c1"}),
            httpx.Response(200, json={"data": [{"id": "m2"}], "next_cursor": None}),
        ]
    )

    pages = [[m["id"] for m in page["data"]] for page in ricky.paginate(ricky.list_messages, CONVERSATION).pages()]

    assert pages == [["m1"], ["m2"]]


@respx.mock
def test_the_async_client_retries_and_paginates():
    respx.get(f"{BASE}/contacts").mock(
        side_effect=[
            api_error(503, "unavailable", retry_after="0"),
            httpx.Response(200, json={"data": [{"id": "a"}], "next_cursor": "c1"}),
            httpx.Response(200, json={"data": [{"id": "b"}], "next_cursor": None}),
        ]
    )
    sent = respx.post(f"{BASE}/conversations/{CONVERSATION}/messages").respond(202, json={"data": SEND})

    async def run():
        async with AsyncRicky(API_KEY) as client:
            ids = [contact["id"] async for contact in client.paginate(client.list_contacts)]
            send = await client.send_message(CONVERSATION, {"type": "text", "text": "Hola"})
            return ids, send

    ids, send = asyncio.run(run())

    assert ids == ["a", "b"]
    assert send["data"]["status"] == "queued"
    assert UUID.match(sent.calls.last.request.headers["idempotency-key"])
