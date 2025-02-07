import { FortyTwo } from "./42";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { db } from "./db/conn";
import * as s from "./db/schema";
import { eq } from "drizzle-orm";
import { tags } from "./tags";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

const ftClient = new FortyTwo();

await db
  .insert(s.offers)
  .values(
    (await ftClient.getOffers("100")).map((offer) => ({
      id: offer.id.toString(),
      offerTitle: offer.title,
      offerDescription: offer.big_description,
      offerSalary: offer.salary,
      offerContract: offer.salary,
      offerEmail: offer.email,
      createdAt: dayjs.utc(offer.created_at).toDate(),
    })),
  )
  .onConflictDoNothing()
  .returning();

const offers = await db.select().from(s.offers).where(eq(s.offers.processed, false));

console.info(`Started... ${offers.length} offers to compute`);

for (let i = 0; i < offers.length; i++) {
  console.info(`Computing offer ${i + 1}/${offers.length}...`);

  const offer = offers[i];

  const { object } = await generateObject({
    model: openai("gpt-4o"),
    prompt:
      "My name is Herbie VINE, a freelancer specializing in modern web and software solutions.\n" +
      "Technologies I am deeply knowledgeable about: React, Nextjs, Nestjs, APIs, Hono, Elysia, Node, Express, JavaScript, TypeScript, Drizzle, Prisma, PostgreSQL, SQL, MongoDB, SQLite.\n" +
      "Technologies I am somewhat knowledgeable about: Golang, C, Microservices, Vue.js, Angular, Svelte, Remix, Astro.\n" +
      "The following offer comes from the 42 network. Regardless of its details, please write an email that proposes my services.\n" +
      "Focus on the potential problems they may face and how I can address them, highlighting my expertise.\n" +
      "Don't lie: if the offer doesn't mention any technologies I am familiar with, don't send an email.\n" +
      "If the offer contract isn't freelancing, mention that I'm just sharing my profile and that I'm open to work, acknowledging that I'm applying for the wrong role.\n" +
      "Do not mention my daily rate (TJM) or any specific pricing.\n" +
      "If the offer's language is French, the email should be in French; if it's English, use English.\n" +
      "It's very important to match the offer's tone, like in Example 3, where the tone was very friendly. It was a Y Combinator startup gig, so I also mentioned that I can move fast (a big +).\n" +
      'If the offer seems young, emphasize that I can adapt quickly and showcase my "newer" frameworks/languages (e.g: Hono).\n' +
      "Please always mention that my CV is attached.\n" +
      "Also include my cal.com booking link (https://cal.com/herbievine) so they can schedule a call (don't wrap it in an anchor tag, paste the whole URL).\n" +
      "If you reject the offer, you NEED to supply a reason. If you don't, you NEED to supply the email subject, html, and language. `to` remains a mandatory field even if the the offer is rejected.\n" +
      "Example 1:\n" +
      "<p>Hey Mathurin,</p>" +
      "<p>I saw your post on 42 about a full-stack opening? I think my experience could really help you and your team out.</p>" +
      "<p>I have about 6 years of experience in full-stack software development. I've also worked in web3 companies (mostly front-end), which may be valuable for your company.</p>" +
      "<p>I work very quickly, use lightweight technologies, and am used to startup pressure. I'm familiar with the JS ecosystem (e.g. Hono, Elysia, React 19, Vite, TypeScript, etc...)</p>" +
      "<p>I've attached my CV to this email, so you can learn more about my background. If you'd like to discuss further, feel free to schedule a call here: <a href=\"https://cal.com/herbievine\">https://cal.com/herbievine</a>.</p>" +
      '<p>All the best,<br>Herbie VINE<br><a href="https://herbievine.com">https://herbievine.com</a><br><a href="mailto:me@herbievine.com">me@herbievine.com</a></p>' +
      "Example 2:\n" +
      "<p>Bonjour,</p>" +
      "<p>Je me permets de vous contacter pour proposer mes services en tant que développeur full-stack.</p>" +
      "<p>J'ai vu votre annonce sur 42, et je pense être parfait pour le job. J'ai beaucoup de connaissances en front-end pour permettre une navigation facile pour sauvegarder les plans BIM. De plus, je pourrais développer une API si elle n'a pas encore été développée.</p>" +
      '<p>Ci-joint, vous trouverez mon CV. Je serais ravi d’échanger davantage avec vous. Vous pouvez également réserver un appel via ce lien : <a href="https://cal.com/herbievine">https://cal.com/herbievine</a>.</p>' +
      '<p>Bien à vous,<br>Herbie VINE<br><a href="https://herbievine.com">https://herbievine.com</a><br><a href="mailto:me@herbievine.com">me@herbievine.com</a></p>' +
      "Example 3:\n" +
      "<p>Hey Theo,</p>" +
      "<p>I came across your job post on 42 and was very interested by your project.</p>" +
      "<p>Your tech stack aligns perfectly with what I'm best at, so I can ship fast.</p>" +
      "<p>I can also quickly adapt depending on your needs and am familiar with a lot of frameworks and libraries in the JS/TS/React ecosystem.</p>" +
      '<p>You can find all my links on my website (GitHub, X, CV, etc...): <a href="https://herbievine.com">https://herbievine.com</a></p>' +
      "<p>I'm up for a chat tomorrow if you're free, here's my calendar: <a href=\"https://cal.com/herbievine\">https://cal.com/herbievine</a></p>" +
      '<p>All the best,<br>Herbie Vine<br><a href="https://herbievine.com">https://herbievine.com</a><br><a href="mailto:me@herbievine.com">me@herbievine.com</a></p>' +
      "You will also output a short and concise description of the role in english, along with tags associated with the offer.\n" +
      `Here are all the supported tags you can track: ${tags.join(", ")}.` +
      "The offer:\n\n```" +
      JSON.stringify(offer) +
      "```",
    schema: z.object({
      description: z.string(),
      tags: z.array(z.string()),

      rejected: z.boolean(),
      rejectedReason: z.string().nullish(),

      to: z.string(),
      subject: z.string().nullish(),
      html: z.string().nullish(),
      lang: z.enum(["en", "fr"]).nullish(),
    }),
  });

  const processedTags = object.tags.filter((tag) => tags.includes(tag)).join(",");

  if (object.rejected) {
    await db
      .update(s.offers)
      .set({
        processed: true,
        processedDescription: object.description,
        processedTags,

        rejected: true,
        rejectedReason: object.rejectedReason,

        sentEmail: false,
      })
      .where(eq(s.offers.id, offer.id));

    console.warn(`Email rejected: ${Bun.env.FRONTEND_URL}/?id=${offer.id}`);

    continue;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="${object.lang}">
      <head>
        <meta charset="UTF-8" />
        <title>TEST - ${object.subject} - ${offer.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #333333;
            line-height: 1.6;
            margin: 20px;
          }
          a {
            color: #0073e6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        ${object.html}
      </body>
    </html>
  `;

  await db
    .update(s.offers)
    .set({
      processed: true,
      processedDescription: object.description,
      processedTags,

      rejected: false,
      rejectedReason: null,

      sentEmail: false,

      emailTo: object.to,
      emailSubject: object.subject,
      emailHtml: html,
      emailLang: object.lang,
    })
    .where(eq(s.offers.id, offer.id));

  console.info(`Email processed: ${Bun.env.FRONTEND_URL}/?id=${offer.id}`);
}
