# thesilhouettegirl: website + private artist dashboard

## 1. Upload to GitHub
Replace the old static site with this complete folder's CONTENTS. Keep `public`, `api`, `lib`, `package.json` and `vercel.json` at the repository root. Upload extracted files, not the ZIP. Do not upload passwords or tokens.

## 2. Vercel configuration
Import the repository (or keep your existing connected project). Set:
- Framework: Other
- Root directory: repository root
- Output directory: public
- Build command: empty
- Install command: npm install
- Node.js: 22.x

Deploy once to obtain your HTTPS website address.

## 3. Connect storage and private settings
In Vercel, connect a **Neon Postgres database** through Storage / Marketplace and a **public Vercel Blob store**. The database account must be allowed to create tables. Set these Production environment variables under Project Settings → Environment Variables:

| Name | Value |
| --- | --- |
| DATABASE_URL | Your actual Neon Postgres connection string, preferably pooled. |
| BLOB_READ_WRITE_TOKEN | Token from your connected public Vercel Blob store. |
| ADMIN_PASSWORD | A unique private passphrase of at least 16 characters. Share only with the artist. |
| SESSION_SECRET | A separate random secret of at least 32 characters. Generate using a password manager. |
| SITE_URL | Your exact live HTTPS origin, e.g. https://your-project.vercel.app, with no path or trailing slash. |

You can generate SESSION_SECRET on a computer with Node using:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Redeploy after adding or changing variables.** Open the exact website address in SITE_URL. If you later add a custom domain, update SITE_URL and redeploy. Never store these values in GitHub.

## 4. First artist login
Open `/dashboard/` on your website, or use Artist login in the footer. Enter ADMIN_PASSWORD. Click **Import my original collection** once. This creates the database table and imports all six works without overwriting existing edits.

Review each painting's availability. Imported works are visible and start **Not for sale**, because their actual availability wasn't supplied. Set Available or Sold as appropriate. Exhibition inclusion is independent.

Before the database is initialized, public pages show the bundled original collection; the dashboard reports missing configuration. Once initialized, database records control the gallery.

## 5. Everyday use
- **Add a painting:** title, dimensions, story, optional price/currency, theme and photo.
- A permanent painting ID is suggested from the title. Keep it unique. It cannot change after saving.
- JPEG, PNG and WebP are supported. Export iPhone HEIC photos to JPEG first. Photos are resized to a maximum of 1800 pixels before upload. Source limit: 25 MB.
- Choose Available, Sold, or Not for sale / exhibition only.
- Tick **Include in my exhibition collection** for any work, including a sold one.
- Tick **Visible in my gallery** to publish; leave off for a draft. Turn it off to archive without deleting.
- Save. Changes appear when visitors open or refresh the gallery. Painting updates need no GitHub changes or redeployment.
- Sold / not-for-sale works stay viewable, with no price or purchase enquiry. Visitors can still discuss their stories.
- Click Edit to update a work. If another tab saved a newer version, reload before editing again.
- Sessions expire after eight hours. To reset a password, change ADMIN_PASSWORD in Vercel and redeploy. Existing sessions then stop working. There is no email reset flow.

## Included
Pink responsive design, first-person artist copy, original artwork, detailed stories, dynamic gallery and artwork pages, theme/availability/exhibition filters, fullscreen viewing, favorites, dream room, private device-local reflection notes, Instagram enquiry drafting, private dashboard, uploads, draft/archive controls, server-side login, HttpOnly signed cookies, origin checks, login attempt limiting, input validation and concurrent-edit protection.

“She” in artwork stories refers to the painted figure. Introductions and narration about the artist now use “I” and “my.”

Original artwork links still work. New links use `/artwork/?id=painting-id`.

## Practical limits
- The dashboard edits paintings, not layout, biography or social links; those remain source edits.
- Photos are public Blob assets. Hiding a painting removes it from gallery results but does not revoke an already-shared image URL. Do not upload confidential images.
- Replacing photos keeps old Blob files to avoid breaking shared links. Remove unused images manually when safe.
- No checkout, payment processing, automatic Instagram sending, permanent-delete button or multiple artist accounts.
- Keep database backups enabled. Database, image storage and hosting have their own usage limits/pricing. Check Vercel's commercial-use plan terms when selling work.
- For previews, use separate test storage and the preview origin in SITE_URL. Do not connect experimental previews to production data.
- Local full-stack development needs Vercel CLI (`vercel dev`) and private environment variables. A basic static server cannot run the API/dashboard.

## Validation and remaining setup
JavaScript syntax and direct security/data checks passed locally: session tampering, expiration, password changes, incorrect signing keys, invalid images, draft visibility, and sold/exhibition independence.

Live login, actual uploads, database writes and browser layout checks have NOT been verified against your services. Connect the settings above, then test adding a draft, publishing, marking sold, including it in an exhibition, editing and hiding it on the real deployment. Dependencies install on Vercel; network restrictions prevented a complete local install.

## Files
`public/` — pages, client code and artwork
`api/[action].js` — Vercel API
`lib/security.js` — sessions and validation
`lib/seed.js` — original collection
`tests/security.test.js` — security checks
`vercel.json` — deployment settings

Official documentation: https://vercel.com/docs/functions/runtimes/node-js · https://vercel.com/docs/vercel-blob · https://vercel.com/docs/storage

## Exclusive painting (new)
Upload and save the large painting with “Visible in my gallery” checked. In the dashboard list, click **Make exclusive** beside it. It appears first in a large feature at the top of the collection, and becomes the opening painting on the home page. Other works follow underneath. Its full image is shown without cropping, including portrait or landscape canvases; enter the actual dimensions in its details.

Only one exclusive selection is stored. Choosing another painting replaces the previous selection. **Remove exclusive** restores the normal collection. Availability is independent: an exclusive painting can be sold or not for sale, and can be included in an exhibition. Drafts cannot be selected. Hiding an already selected painting removes it from public display; republishing it restores the feature unless you changed the selection.

Gallery filters also apply to the exclusive work. A filter that doesn't match it will hide it from that filtered view. No new environment settings or manual migration are needed; the exclusive-setting table is created when an authenticated artist first chooses a painting.

No painting was preselected: the actual exclusive painting has not yet been supplied. Upload it through the dashboard and choose Make exclusive.
