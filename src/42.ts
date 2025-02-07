import { z } from "zod";

export const offerSchema = z.object({
  id: z.number(),
  title: z.string(),
  little_description: z.string(),
  big_description: z.string(),
  salary: z.string(),
  contract_type: z.string(),
  email: z.string(),
  full_address: z.string(),
  created_at: z.string(),
});

export class FortyTwo {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.baseUrl = "https://api.intra.42.fr";

    if (!Bun.env.FT_CLIENT_ID) {
      throw new Error("FT_CLIENT_ID is missing from .env");
    } else if (!Bun.env.FT_CLIENT_SECRET) {
      throw new Error("FT_CLIENT_SECRET is missing from .env");
    }

    this.clientId = Bun.env.FT_CLIENT_ID;
    this.clientSecret = Bun.env.FT_CLIENT_SECRET;
  }

  async getOffers(limit?: string) {
    const url = new URL("/v2/offers", this.baseUrl);

    url.searchParams.append("page[size]", limit ?? "10");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${await this.accessToken()}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("ERROR RESPONSE FROM BRIDGE", response);
    }

    const json = await response.json();

    const { data, error } = z.array(offerSchema).safeParse(json);

    if (error) {
      throw new Error("Error validating offers data");
    }

    return data;
  }

  private async accessToken() {
    const url = new URL("/oauth/token", this.baseUrl);

    url.searchParams.append("grant_type", "client_credentials");
    url.searchParams.append("client_id", this.clientId);
    url.searchParams.append("client_secret", this.clientSecret);

    const request = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });

    const json = await request.json();

    return json.access_token as string;
  }
}
