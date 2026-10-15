"""The official Python SDK for the Ricky REST API: https://getricky.ai/docs/api"""

from ._client import DEFAULT_BASE_URL, AsyncPaginator, AsyncRicky, Paginator, Ricky
from ._errors import RickyConnectionError, RickyError, WebhookVerificationError
from ._page import Page, Resource
from ._version import __version__
from ._webhooks import verify_webhook

__all__ = [
    "DEFAULT_BASE_URL",
    "AsyncPaginator",
    "AsyncRicky",
    "Page",
    "Paginator",
    "Resource",
    "Ricky",
    "RickyConnectionError",
    "RickyError",
    "WebhookVerificationError",
    "__version__",
    "verify_webhook",
]
