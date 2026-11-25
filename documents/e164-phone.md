# E.164 Phone Input

Adds a country selector to the phone field (`supporter.phoneNumber2`) and
converts the number to E.164 format (`+12015550124`) when the form submits.
The selector shows the flag and dial code (`+44`), and the field holds the
rest of the number. When a supporter enters a full international number, the
code moves out of the field and into the selector.

Parsing uses the bundled `libphonenumber-js` library. The only outside
requests are the flag images and one IP lookup on the page's own domain.

| Supporter enters       | Selector   | Field shows      | EN receives     |
|------------------------|------------|------------------|-----------------|
| `(201) 555-0124`       | US `+1`    | `(201) 555-0124` | `+12015550124`  |
| `07400 123456`         | UK `+44`   | `07400 123456`   | `+447400123456` |
| `+44 7400 123456`      | UK `+44`   | `7400 123456`    | `+447400123456` |
| `Tel: +44 7400 123456` | UK `+44`   | `7400 123456`    | `+447400123456` |
| `0044 7400 123456`     | UK `+44`   | `7400 123456`    | `+447400123456` |
| (empty)                | any        | (empty)          | (empty)         |

The first two rows assume the supporter already picked that country, or the
IP lookup did.

## Setting up a page

There is nothing to add. The selector appears on any page with
`supporter.phoneNumber2` in a form block. Other phone fields, such as
`supporter.phoneNumber`, are left alone.

EN checks the phone field with its own regex before the number is converted.
Make sure the field uses the regex in [EN's phone regex](#ens-phone-regex),
or EN will reject many non-US numbers.

### Turning it off

Add `engrid-phone-no-country-select` to the custom class field of any form
block on the page. This turns the selector and the conversion off for the
whole page, not only that block, and the phone field goes back to the plain EN
input.

### Prefilling from a URL

Write the `+` as `%2B` to avoid errors.

## Starting country

When the page loads, the selector picks a country in this order:

1. **After a failed submission**, the country and the exact text the supporter
   typed are restored. Nothing else below runs.
2. **A number already in the field that starts with `+` or `00`** sets the
   country, and its calling code moves into the selector. This covers numbers
   prefilled from a URL or from the supporter's EN record.
3. **The supporter's IP country**, read from `/cdn-cgi/trace` on the page's own
   domain. This works on `preserve.nature.org`, which is behind Cloudflare.
4. **If the IP lookup fails** or returns a country the library doesn't
   support, the value of `supporter.country`, then United States.

The selector shows United States until the IP response comes back. When it
does, an empty, prefilled or autofilled national number takes the IP country.
Only the flag and placeholder change, never the number.

A late IP response can't override a country the supporter picked or one that
came from an international number. Changing `supporter.country` after the page
loads doesn't change the phone country either. Supporters set it with the
selector or by entering an international number.

## The country list

United States, Canada and United Kingdom come first, then a divider, then every
other country and territory the library knows (245 in the current version) in
alphabetical order. Country names come from the browser in the page's
language, so a page with `<html lang="fr">` lists them in French.

The field placeholder is an example mobile number for the selected country:
`(201) 555-0123` for the US, `07400 123456` for the UK.

Flags load from flagcdn.com. If one fails to load, the two-letter country code
(`GB`) shows in its place. The selector grows to fit the dial code, from `+1`
to `+998`, and the field's left padding follows it.

### Keyboard

| Key                         | What it does                                  |
|-----------------------------|-----------------------------------------------|
| Enter, Space, ↑ or ↓        | Opens the list                                |
| ↑, ↓, Home, End             | Moves through the list                        |
| Enter or Space              | Picks the highlighted country                 |
| Escape                      | Closes the list and returns focus to the flag |
| Tab                         | Closes the list                               |

There is no type-to-search, so keyboard users reach countries further down by
arrowing or pressing End.

## Typing a number

A national number is never rewritten. Spaces, dashes and brackets stay as
typed.

An international number, starting with `+` or `00`, sets the flag, and its
calling code then moves into the selector. Anything before the number goes
too, so `Tel: +44 7400 123456` becomes `7400 123456`. The rest stays as
entered, including spacing and UK-style `(0)`.

The code moves when the supporter:

- Pastes or drops a number into the field
- Fills it with browser autofill
- Leaves the field after typing

While the supporter is typing, the flag follows the number but the field isn't
changed. That keeps the cursor from jumping, and gives shared codes the digits
they need: `+1` alone is the US, but `+1 242 …` is the Bahamas. Pressing Enter
in the field counts as leaving it: the browser commits the field before the
form submits, so the code has moved by the time EN checks the number.

The code stays in the field if removing it would change the submitted number,
or if the library doesn't recognise it (a lone `+`, `+999123`). No example
number for any country failed that check when tested against the current
library version.

### Picking a country

Picking a country changes the flag, dial code and placeholder. The field
already holds only the national part, so the number itself doesn't change,
and EN receives it with the new country's code:

| Field         | Country picked | EN receives     |
|---------------|----------------|-----------------|
| `7700 900123` | United Kingdom | `+447700900123` |
| `7700 900123` | Italy          | `+397700900123` |

`07700 900123` is in Ofcom's range reserved for fiction, so it never reaches a
real person.

### Shared calling codes

Some calling codes cover more than one country. `+1` is the US, Canada and most
of the Caribbean. `+44` is the UK, Jersey, Guernsey and the Isle of Man. The
selector settles these in order:

1. A country the library can identify from the full number
2. The country the supporter already settled on (picked, or from an earlier
   number), if it uses that calling code
3. The recognised supporter's country (`supporter.country`, only when
   `pageJson.supporterId` is set), if it uses that calling code
4. The IP country, if it uses that calling code
5. The primary country for that code

| Code   | Primary country |
|--------|-----------------|
| `+1`   | United States   |
| `+7`   | Russia          |
| `+39`  | Italy           |
| `+44`  | United Kingdom  |
| `+47`  | Norway          |
| `+61`  | Australia       |
| `+212` | Morocco         |
| `+262` | Réunion         |
| `+290` | Saint Helena    |
| `+358` | Finland         |
| `+590` | Guadeloupe      |
| `+599` | Curaçao         |

The flag can change as more digits come in. `+1 204` shows the US flag, and
`+1 204 555 0123` switches it to Canada. `+44 1534 456789` shows Jersey. The
country is settled from the full number before the code leaves the field,
because the national part alone can't tell Canada from the US.

Some results come from the library's numbering data and can look surprising:
`+44 7911…` is a Guernsey mobile range, and `+39 06 698…` is the Vatican's
block inside Rome's area code.

Only `pageJson.supporterId` marks a recognised supporter. URL parameters, the
ENgrid autofill cookie and browser autofill don't.

## What gets submitted

EN checks the phone field before this component converts anything. On submit,
EN runs its own validation first, including the regex set on the phone field.
Only when every check passes does it call ENgrid's submit hook, where the
number is converted to E.164. If the regex fails, EN shows "Please enter a
valid phone number" under the field, nothing is converted, and nothing is
sent. The supporter has to change the number and submit again.

EN tests the field exactly as it looks at that moment. By then the calling code
has moved into the selector, so EN sees only the national part, not the
`+` number.

### EN's phone regex

Set the phone field's custom validation in EN to this regex:

```
^(?:\s*\+?[\s().-]*(?:\d[\s().-]*){7,15})?$
```

It accepts 7 to 15 digits, with spaces, brackets, dots and dashes anywhere
between them and an optional `+` at the start. An empty field passes, so
whether the phone is required stays with EN's required setting. Letters fail,
including labels and extensions.

The 7-digit minimum catches short typos like `201` while still accepting
almost everywhere. Of libphonenumber's 245 example mobile numbers, 231 pass
both written the national way and with the code moved to the selector. The 14
that fail are small territories with 4 to 6 digit numbers, such as Andorra,
the Faroe Islands, Greenland, New Caledonia, Saint Helena and Tokelau. 15 is
the E.164 maximum.

The regex doesn't know the selected country, so it can't check that a number
is the right length for that country. A US number missing its area code
(`555-0124`) has 7 digits and passes, because 7 and 9 digit numbers are
real elsewhere: France's `6 12 34 56 78` is 9 digits.

| Field at submit     | Selected      | EN regex | EN receives         | Note                                  |
|---------------------|---------------|----------|---------------------|---------------------------------------|
| `(201) 555-0124`    | United States | Passes   | `+12015550124`      |                                       |
| `7400 123456`       | UK            | Passes   | `+447400123456`     | `+44` moved to the selector           |
| `(0)7400 123456`    | UK            | Passes   | `+447400123456`     | UK-style `(0)` kept                   |
| `6 12 34 56 78`     | France        | Passes   | `+33612345678`      | `+33` moved to the selector           |
| `1512 3456789`      | Germany       | Passes   | `+4915123456789`    | `+49` moved to the selector           |
| `612 34 56 78`      | Spain         | Passes   | `+34612345678`      |                                       |
| `412 345 678`       | Australia     | Passes   | `+61412345678`      |                                       |
| (empty)             | any           | Passes   | (empty)             |                                       |
| `555-0124`          | United States | Passes   | `+15550124`         | Missing its area code                 |
| `201555012412345`   | United States | Passes   | `+1201555012412345` | Over 15 digits once `+1` is added     |
| `201`, `1234`       | any           | Fails    | nothing             | Under 7 digits                        |
| `+999123`           | any           | Fails    | nothing             | Under 7 digits                        |
| `2015550124123456`  | any           | Fails    | nothing             | Over 15 digits                        |
| `+1`, `+`           | any           | Fails    | nothing             |                                       |
| `Tel: 07400 123456` | UK            | Fails    | nothing             | Labels only come off `+` numbers      |

EN shows "Please enter a valid phone number" for the rows that fail.

### Pages on the old regex

TNC pages were set up with this regex (pages 200334 and 205802 both have it):

```
^(?:((\+?\d{2,3})|(\(\+?\d{2,3}\))) ?)?(((\d{2}[\ -.]?){3,5}\d{2})|((\d{3}[\ -.]?){2}\d{4})|(\(?(\d{3})\)?([ .-]?)(\d{3})([ .-]?)(\d{4}))?)$
```

It's built around US and UK numbers and rejects a lot of real ones. Of the 245
example mobile numbers, only 92 pass in the form the field holds after the code
moves to the selector. Numbers whose national form starts with a trunk `0`
lose it (France `6 12 34 56 78`, Germany, Ireland) and fail, and Spain,
Australia, Brazil and India fail however they're written. Any page still on
this regex needs its phone validation changed.

### Conversion

When EN's check passes, the conversion never blocks submission or adds an
error. It changes the format, not whether the number is real, so the
`555-0124` and 15-digit rows above reach EN as numbers that aren't valid
E.164.
Analytics
and SMS handlers that read the field after this point get the E.164 value too.

When the library can't produce E.164, the fallback is `+` plus the digits for
a `+` number, or `+`, the selected country's dial code and the digits for a
national one. A value with no digits becomes empty. In practice the library
returns a value for almost anything with a digit in it.

A leading `00` is always read as the international prefix, whatever country
is selected. Other exit codes, such as `011` from the US, are left to the
library.

## Failed submissions

Before converting, the component saves the typed text, the country, the page
ID and the field name to session storage
(`engrid_e164_phone_submission`). If the submission fails, the field shows
the number as it was, with its country, not the E.164 value. A `+` number
that was submitted before its code moved gets its code moved on restore.

This covers both kinds of failure:

- **Errors shown on the same page**, through ENgrid's `onError` event and its
  error-list watcher
- **A full page reload with an error**, through EN's
  `checkSubmissionFailed()`, matched on page ID and field name

The saved state is cleared once it's restored, on any page load that isn't a
failed submission, and as soon as the supporter edits the number or picks a
country. If session storage is blocked, same-page errors still restore from
memory.

## Limitations

- No check on length, numbering plan, ownership, or whether the number can take
  calls or texts
- No separate extension value. Extension digits pasted with the number may be
  read as part of it.
- IP location can be missing or wrong (travel, VPNs). A national number
  autofilled on a UK VPN starts with the UK flag until the supporter changes
  it.
- Later changes to `supporter.country` don't move the phone country, and nor
  does a national number from browser autofill. An international number does.
- A `+` number with a calling code the library doesn't know stays in the field
  and is submitted as typed, whatever the flag shows.
- Restoring after a failure depends on ENgrid's error hooks. A digital wallet
  cancel or an interrupted submit that raises no ENgrid error may leave the
  E.164 value in the field.
- Numbering plans change. Update `libphonenumber-js` from time to time to pick
  up new metadata.

## Code

| File                                  | What it holds                                      |
|---------------------------------------|----------------------------------------------------|
| `src/scripts/e164-phone.ts`           | The component, started in `src/index.ts`           |
| `src/sass/components/e164-phone.scss` | Selector and list styles                           |
| `src/scripts/main.js`                 | `updatePlaceholder` skips the enhanced phone field |

The component adds `e164-phone--enhanced` to the field's
`.en__field__element` and `e164-phone--enhanced-form` to its form block, which
is useful for targeting styles.

## Testing

Add `?debug=true` to any page with the phone field. Each submit logs
`Formatted phone for submission: <value>` in the console under `E164Phone`,
and a failed IP lookup logs `Unable to determine phone country from IP`.

To see the IP country the page will use, open `/cdn-cgi/trace` on the same
domain and read the `loc=` line:

```
https://preserve.nature.org/cdn-cgi/trace
```

To try conversion and restore without posting the form, type a number, then
run these in the browser console. They fire ENgrid's submit and error events,
so nothing reaches EN. Other ENgrid submit handlers run too, including the
data layer push to analytics, so do this on a DEV page:

```js
enOnSubmit() // field now shows the E.164 value
enOnError() // field goes back to what it showed before
```
