import { Hono } from "hono";
import { db } from "./db/conn";
import * as s from "./db/schema";
import { and, desc, eq, isNotNull, isNull, like, or } from "drizzle-orm";
import { Resend, type CreateEmailOptions } from "resend";
import { z } from "zod";

const app = new Hono();
const resend = new Resend(Bun.env.RESEND_API_KEY);

app.get("/", async (c) => {
  const id = c.req.query("id");
  const email = c.req.query("email");
  const sent = c.req.query("sent");
  const tag = c.req.query("tag");

  const offers = db
    .select()
    .from(s.offers)
    .where(
      and(
        eq(s.offers.processed, true),
        eq(s.offers.rejected, false),
        isNull(s.offers.rejectedReason),
        id ? eq(s.offers.id, id) : undefined,
        email ? eq(s.offers.emailTo, email) : undefined,
        sent ? eq(s.offers.sentEmail, sent === "true") : undefined,
        tag ? like(s.offers.processedTags, `%${tag}%`) : undefined,
      ),
    )
    .orderBy(desc(s.offers.createdAt))
    .all();

  return c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Emails</title>
        <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
      </head>
      <body>
        <main class="w-full mx-auto max-w-7xl py-12">
          <h1>Emails ({offers.length}):</h1>
          <ol class="flex flex-col divide-y divide-neutral-200">
            {offers.map((offer) => (
              <div key={offer.id} class="py-4 flex flex-col space-y-4">
                {offer.sentFailedReason ? <p>Sent failure reason: {offer.sentFailedReason}</p> : null}
                {offer.rejectedReason ? <p>Rejected reason: {offer.rejectedReason}</p> : null}
                {offer.emailSubject ? (
                  <>
                    <iframe name="dummy" id="dummy" style="display: none;"></iframe>
                    <div class="flex flex-col divide-y divide-neutral-200 bg-neutral-100 border border-neutral-200 rounded-lg">
                      <div class="px-4 py-2 flex justify-between items-center">
                        <h2>
                          Title: <strong class="font-semibold">{offer.offerTitle}</strong>
                        </h2>
                        <a
                          href={`https://companies.intra.42.fr/en/offers/${offer.id}`}
                          rel="nooppener noreferer"
                          target="_blank"
                          class="!text-neutral-800 text-sm !underline"
                        >
                          Offer at 42.fr
                        </a>
                      </div>
                      <div class="px-4 py-2 flex justify-between items-center">
                        <span>
                          Description: <strong class="font-semibold">{offer.processedDescription}</strong>
                        </span>
                      </div>
                      <div class="px-4 py-2 flex items-center space-x-2">
                        {offer.processedTags?.split(",").map((tag, i) => {
                          const bg = ["bg-amber-400/50", "bg-emerald-400/50", "bg-cyan-400/50"];

                          return (
                            <a
                              key={tag}
                              href={`${Bun.env.FRONTEND_URL}/?tag=${tag}`}
                              class={`px-2 py-0.5 rounded-full !text-black ${bg[i % bg.length]}`}
                            >
                              {tag}
                            </a>
                          );
                        })}
                      </div>
                      <div class="px-4 py-2 flex justify-between items-center">
                        <span>
                          To: <strong class="font-semibold">{offer.emailTo}</strong>
                        </span>
                      </div>
                      <div class="px-4 py-2 flex justify-between items-center">
                        <span>
                          Subject: <strong class="font-semibold">{offer.emailSubject}</strong>
                        </span>
                      </div>
                      <div class="px-4 py-2" dangerouslySetInnerHTML={{ __html: offer.emailHtml ?? "" }} />
                      {!offer.sentEmail ? (
                        <div class="px-4 py-2 flex justify-end space-x-2">
                          <form action={`/mark/${offer.id}`} method="post" target="dummy">
                            <button class="font-semibold underline" type="submit">
                              Already sent?
                            </button>
                          </form>
                          <form action={`/send/${offer.id}`} method="post" target="dummy">
                            <button class="font-semibold underline" type="submit">
                              Send!
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div class="px-4 py-2 flex justify-end">
                          <span class="font-semibold">Already sent!</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <pre>
                    <code>{JSON.stringify(offer, null, 2)}</code>
                  </pre>
                )}
              </div>
            ))}
          </ol>
        </main>
      </body>
    </html>,
  );
});

app.post("/send/:id", async (c) => {
  const id = c.req.param("id");

  const offer = db.select().from(s.offers).where(eq(s.offers.id, id)).get();

  if (!offer) {
    return c.json({ ok: false, message: `Offer ${id} not found` });
  }

  const { data, error, success } = z
    .object({
      emailTo: z.string().email(),
      emailSubject: z.string(),
      emailHtml: z.string(),
      emailLang: z.string().length(2),
    })
    .safeParse(offer);

  if (!success) {
    return c.json({ ok: false, message: error.errors[0].message });
  }

  const email: CreateEmailOptions = {
    from: "Herbie Vine <me@herbievine.com>",
    to: data.emailTo,
    bcc: "Herbie Vine <me@herbievine.com>",
    subject: data.emailSubject,
    html: data.emailHtml,
    attachments: [
      {
        path: "https://herbievine.com/static/cv-herbie-vine.pdf",
        filename: "cv-herbie-vine.pdf",
      },
    ],
  };

  const response = await resend.emails.send(email);

  if (response.error) {
    console.error(`Error sending email: ${Bun.env.FRONTEND_URL}/?id=${offer.id}`, email, response.error);

    await db
      .update(s.offers)
      .set({
        sentFailedReason: response.error.message,
      })
      .where(eq(s.offers.id, offer.id));

    return c.json({ ok: false, message: `Error sending email: ${response.error}` });
  } else {
    console.info(`Email sent: ${Bun.env.FRONTEND_URL}/?id=${offer.id}`);

    await db
      .update(s.offers)
      .set({
        rejected: false,
        sentEmail: true,
      })
      .where(eq(s.offers.id, offer.id));
  }

  return c.json({ ok: true });
});

app.post("/mark/:id", async (c) => {
  const id = c.req.param("id");

  const offer = db.select().from(s.offers).where(eq(s.offers.id, id)).get();

  if (!offer) {
    return c.json({ ok: false, message: `Offer ${id} not found` });
  }

  await db
    .update(s.offers)
    .set({
      rejected: false,
      sentEmail: true,
    })
    .where(eq(s.offers.id, offer.id));

  return c.json({ ok: true });
});

export default app;
