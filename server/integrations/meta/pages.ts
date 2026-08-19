/**
 * Facebook Page & Instagram Account Discovery Module
 *
 * Queries the Meta Graph API `/me/accounts` endpoint and paginates through all
 * Facebook Pages available to the user. For each Page, checks for a linked
 * `instagram_business_account`.
 *
 * Internal Discovery Pipeline:
 *   Returns ALL discovered Pages and linked Instagram Business accounts.
 *   Does not stop at the first result.
 */

import { metaClient } from "./client";
import type { FacebookPage, DiscoveredAccount } from "./types";

interface PageAccountsResponse {
  data: FacebookPage[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

/**
 * Fetch all Facebook Pages and linked Instagram Business accounts for a user.
 * Automatically handles Graph API pagination until all Pages are retrieved.
 *
 * @param userAccessToken - A long-lived user access token.
 * @returns Array of all discovered Facebook Pages and linked Instagram accounts.
 */
export async function fetchAllPages(userAccessToken: string): Promise<DiscoveredAccount[]> {
  const discovered: DiscoveredAccount[] = [];
  let afterCursor: string | undefined = undefined;

  const fields =
    "id,name,access_token,category,picture{url},instagram_business_account{id,username,name,profile_picture_url}";

  console.log("[Meta Discovery] Querying Facebook Pages & linked Instagram accounts...");

  do {
    const params: Record<string, string> = { fields };
    if (afterCursor) {
      params.after = afterCursor;
    }

    const response: PageAccountsResponse = await metaClient.get<PageAccountsResponse>(
      "/me/accounts",
      userAccessToken,
      params
    );

    const pages = response.data || [];
    for (const page of pages) {
      const igAccount = page.instagram_business_account || null;

      discovered.push({
        page,
        instagramAccount: igAccount,
      });

      console.log(
        `[Meta Discovery] Discovered Page: "${page.name}" (ID: ${page.id})` +
          (igAccount ? ` → Linked Instagram: @${igAccount.username || igAccount.id}` : " (No Instagram linked)")
      );
    }

    // Check for next page of results
    if (response.paging?.next && response.paging?.cursors?.after) {
      afterCursor = response.paging.cursors.after;
    } else {
      afterCursor = undefined;
    }
  } while (afterCursor);

  console.log(`[Meta Discovery] Total Pages discovered: ${discovered.length}`);
  return discovered;
}
