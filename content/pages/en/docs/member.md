---
title: "Member features (the login sandbox)"
description: "An opt-in member module: member issuance, login, a login-status overlay, My Page, and favorites"
pageType: "other"
---

# Member features (the login sandbox)

The `member` module is an opt-in feature that manages member IDs and attributes, login/logout, and an overlay showing whether someone is currently logged in. It performs no real authentication whatsoever — no password checks, no session tokens. It's a **login sandbox built for verification purposes**: as long a member ID has been issued, anyone can log in as that ID. There's no concept of a password at all.

It exists to support marketing-tool verification (post-login personalization, integration with ACDL's `user` namespace, and so on), not as a real authentication system.

## Turning it on or off

`member.enabled` in `site.config.ts` toggles the entire feature.

```ts
const siteConfig: SiteConfig = {
  member: {
    enabled: true, // set to false and member-related pages won't be built
  },
};
```

When `enabled` is `false`, the `getStaticPaths()` for `/member`, `/login`, `/commerce/member`, and `/commerce/member/favorites` each return an empty array, so those pages simply aren't generated during the build — a natural on/off switch given Astro's static-site generation model. The login-status overlay is likewise only injected from the shared layout (`Base.astro`) when `enabled` is `true`.

## Layout of `src/modules/member/`

```
src/modules/member/
  lib/
    member.ts        # Member data and session management (localStorage)
    acdl-bridge.ts    # Converts member:login/member:logout into ACDL's user namespace
  components/
    MemberOverlay.astro  # The login-status overlay, injected into every page
```

The member module is fully independent of commerce — it has zero dependency on it. The only relationship runs the other way: commerce's favorites feature reads `getCurrentMemberId()` from member.

## Member data and sessions (`member.ts`)

`src/modules/member/lib/member.ts` manages a member roster and login session in `localStorage`, following the same pattern as cart (plain TS functions, `CustomEvent`s, cross-tab sync via the `storage` event).

```ts
type Member = {
  id: string;
  attributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

listMembers(): Member[]
getMember(id: string): Member | undefined
saveMember(id: string, attributes: Record<string, string>): Member  // updates if the id exists, creates otherwise
deleteMember(id: string): void

getCurrentMemberId(): string | null
getCurrentMember(): Member | null
login(id: string): Member | null   // returns null for an unissued id
logout(): void

exportMembers(): string             // serializes the roster to a JSON string
importMembers(json: string): Member[]  // bulk-imports a roster from a JSON string
```

A member is a simple record: just an ID and a free-form set of attributes (key-value pairs). Nothing constrains the attribute values, so you can set arbitrary fields for personalization testing — a membership tier, a region, whatever you need.

Every mutation dispatches one of `member:change`, `member:login`, or `member:logout` as a `CustomEvent` on `window`. Changes made in another tab are picked up via the `storage` event and re-dispatched as the same events, so login state stays in sync across open tabs.

## The member issuance page (`/member`)

A page for creating and updating arbitrary member IDs and attributes. Think of it as a verification-only stand-in for "registering a member in an admin panel" — there's no authentication involved.

- A form to enter a member ID and any number of attribute key/value pairs, then save
- A list of issued members with edit and delete controls
- A "log in" button on each row that logs in as that member directly and navigates to `/login`
- Export/import of the whole roster as JSON, useful for reproducing or sharing a test setup

## The login page (`/login`)

Enter a member ID here to log in. Any ID that hasn't already been issued on the member issuance page produces an error. While logged in, the page shows the current member ID and a logout button.

## The login-status overlay (`MemberOverlay.astro`)

A fixed overlay pinned to the bottom-right corner of every page, showing the current login state. It's conditionally injected from `Base.astro` whenever `member.enabled` is true. It isn't a Block — it sits alongside Breadcrumbs and LanguageSwitcher as a layout component.

- Logged in: shows the current member ID and a logout button
- Logged out: shows a quick-switch dropdown of issued members plus a login button, and a link to the login page

Quick-switch lets you log in as a different member right from wherever you are, without leaving the page — handy during development and testing. The dropdown is disabled when no members have been issued yet.

## My Page (`/commerce/member`) and favorites

A hub page for logged-in members. It's implemented as part of the `commerce` module, but only generated when `member.enabled` is true; if nobody is logged in, it shows a link to the login page instead. Currently its only link is to `/commerce/member/favorites`.

Favorites itself is a `commerce`-module feature, but since it's tied to the logged-in member, it depends on member's `getCurrentMemberId()`. See [The commerce module](/en/docs/commerce) for details.

## ACDL integration (the `user` namespace)

`src/modules/member/lib/acdl-bridge.ts` subscribes to `member:login`/`member:logout` and converts them into pushes on Adobe Client Data Layer's (ACDL) `user` namespace. `member.ts` itself has no knowledge that ACDL exists — this is the same central-bridge pattern that commerce's `cart.ts` → `acdl-bridge.ts` uses.

```ts
// On login
window.adobeDataLayer.push({ user: { id: member.id, ...member.attributes } });

// On logout
window.adobeDataLayer.push({ user: null });
```

The member's `attributes` are spread directly into the `user` object. Whatever attributes you set freely on the member issuance page (a membership tier, say) flow straight through to ACDL, so you can test tag-manager personalization rules against them as-is.

`acdl-bridge.ts` is loaded from `MemberOverlay.astro`'s `<script>`. Since the overlay itself is injected on every page when `member.enabled` is true, login/logout events reach ACDL reliably no matter where they originate — the member issuance page, the login page, or the overlay itself.

Because `window.adobeDataLayer` is scoped per page (a full page navigation clears it), the bridge also re-pushes the current `user` state at load time if someone is already logged in. Without this, navigating straight from the member issuance page's quick-login to `/login` would leave the new page's `adobeDataLayer` without the `user` push that happened on the previous page.

For the full ACDL design (initialization order, when to use the direct-push pattern vs. the central-bridge pattern), see [Adobe Client Data Layer integration](/en/docs/analytics-acdl).
