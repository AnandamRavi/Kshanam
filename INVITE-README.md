# Generated invitations

Each guest's invitation is built in the browser from your sheet, using the artwork in `invite/`.
Pages: cover, illustration, family page, events (two per page, then the venue), back cover.
A guest with one event gets a shorter invitation; two events get no separate venue page; all three get the full set.
"Save invitation as PDF" prints one page per card at 590 x 576 pt, the size of your original PDF.

## Files added or changed
- `invite.js`, `invite.css` - the generator
- `invite/` - artwork taken from your PDF (cover-bg.png, scene.jpg, back-bg.png, ornament.png, icon-<eventid>.png)
- `index.html`, `script.js` - load the generator and call it. `script.js` has a small block labelled InviteMode.
- `invite-preview.html` - tick any combination of events and see the invite, no guest code needed
- `Settings_invite_rows.csv` - every new Settings key with its default (paste what you want into the Settings tab)

## Sheet changes
**Events tab** - add these columns at the far right (all optional):
- `InviteLabel` - small caps line above the title, e.g. THE MEHNDI
- `InviteDescription` - short blurb for the invite. If blank, the first line of `Description` is used.
- `InviteIcon` - image link for the round icon. If blank, `invite/icon-<ID in lowercase>.png` is used.

**Wedding Party tab** - names are found from the Role column:
- Bridegroom / Bride: full names on the family page; first words on the cover
- Role containing father or mother plus groom (or bride): the parents (father listed first)
- Role containing sister or brother plus bride or groom: "With their joy shared by"
- Grandparents: a Role containing grandfather or grandmother (or nana, nani, dada, dadi) plus bride or groom. They appear under each partner's name, as in the Dhwani and Arnesh invite: "Grandson of" / "Granddaughter of", with an "and" between pairs. Put "paternal" or "maternal" in the Role (e.g. "Maternal grandmother of the bride") to form the pairs; with no such wording they are shown as one pair/group.
- Fathers and grandfathers are listed first. Set `InviteParentOrder` to `sheet` to keep the Party tab order instead (the Dhwani and Arnesh invite lists mothers first).
- `InviteBlessing` adds a line at the top, e.g. || Om Ganapathaye Namaha ||
- To override any of these, fill the matching Settings row (`InviteGroomParents`, `InviteBrideParents`, `InviteJoyBy`, `InviteGroomGrandparents`, `InviteBrideGrandparents`, `InviteName1`, `InviteName2`, `InviteFullName1`, `InviteFullName2`). Separate several names with `;`.

**Settings tab** - fonts, sizes and colours, for every piece of text:
`Invite<Element>_Font`, `_Size`, `_Color` (also optional `_Weight` and `_Style` = italic/normal).
Font = `display`, `body` or any Google Font name. Size is in points on a 590 pt wide card, so you can read sizes straight off a design tool; the card scales as a whole.
`InviteFontDisplay` / `InviteFontBody` set the two main fonts in one go.

## Keeping or mixing PDFs
`InviteMode` in Settings: `generated` (default), `auto` (a PDF from the Invitations tab wins when its row matches), `pdf` (old behaviour).

## Notes
- Dates and times are read as they appear in the published CSV ("February 13, 2027", "17:00"), and shown as "Saturday, February 13th, 2027" and "5:00 PM onwards".
- Fonts load from Google Fonts, so the guest needs a connection. Browsers from 2023 onwards are supported (container query units).
- The Wedding Party names are used exactly as written, so `Lajwanti "Lajjo" Singh` shows the nickname; use `InviteBrideParents` for the plain form.
