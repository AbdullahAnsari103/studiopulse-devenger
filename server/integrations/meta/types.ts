/**
 * Meta Integration TypeScript Interfaces & Types
 *
 * Contains all type definitions for OAuth tokens, Graph API responses,
 * Facebook Pages, Instagram Business Accounts, and discovery results.
 */

export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaUserProfile {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

export interface InstagramBusinessAccount {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
  instagram_business_account?: InstagramBusinessAccount;
}

export interface DiscoveredAccount {
  page: FacebookPage;
  instagramAccount: InstagramBusinessAccount | null;
}

export interface MetaGraphErrorPayload {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface MetaDiscoveryMetadata {
  user: MetaUserProfile;
  userAccessToken?: string;
  discovered: DiscoveredAccount[];
  primaryPage: FacebookPage | null;
  primaryInstagram: InstagramBusinessAccount | null;
  tokenExpiry: string | null;
  [key: string]: unknown;
}
