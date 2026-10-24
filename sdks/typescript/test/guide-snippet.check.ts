// The docs guide's TypeScript example (apps/docs/content/docs/api/index*.mdx); only typechecked.
import { Ricky } from 'getricky';

export async function guideExample(): Promise<void> {
  const ricky = new Ricky(process.env.RICKY_API_KEY);

  const { data: channels } = await ricky.listChannels();
  const { data: send } = await ricky.startConversation({
    body: { channel_id: channels[0]!.id, phone: '+50760001234', template: { id: '1234567890' } },
  });
  for await (const contact of ricky.paginate(ricky.listContacts)) console.log(contact.first_name);
  console.log(send.status);
}
