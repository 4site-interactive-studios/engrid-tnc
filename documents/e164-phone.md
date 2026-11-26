# E.164 Phone Input

Adds a country selector to the phone field (`supporter.phoneNumber2`) and
converts the number to E.164 format (`+12015550124`) when the form submits.
The selector and list follow the TidyContact phone field. The number is
reformatted, not validated.

There are no dependencies. The only outside requests are the flag images and
one IP lookup on the page's own domain.

| Supporter enters      | Selector | EN receives     |
|-----------------------|----------|-----------------|
| `(201) 555-0124`      | US       | `+12015550124`  |
| `07400 123456`        | UK       | `+447400123456` |
| `+44 7400 123456`     | UK       | `+447400123456` |
| `+44 (0)7400 123456`  | UK       | `+447400123456` |
| `(+44) 7400 123456`   | UK       | `+447400123456` |
| `0044 7400 123456`    | UK       | `+447400123456` |
| `06 1234 5678`        | Italy    | `+390612345678` |
| (empty)               | any      | (empty)         |

The field always shows what the supporter typed. Only the submitted value
changes.

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
whole page, and the phone field goes back to the plain EN input.

### Prefilling from a URL

Write the `+` as `%2B` to avoid errors.

## Starting country

When the page loads, the selector picks a country in this order:

1. **After a failed submission**, the country and the text the supporter
   typed are restored. Nothing else below runs.
2. **A number already in the field that starts with `+`, `(+` or `00`** sets the
   country from its calling code.
3. **The supporter's IP country**, read from `/cdn-cgi/trace` on the page's own
   domain. This works on `preserve.nature.org`, which is behind Cloudflare.
4. **If the IP lookup fails**, the value of `supporter.country` if it's a
   two-letter code, otherwise United States.

The selector shows United States until the IP response comes back. A late IP
response doesn't replace a country the supporter picked or one taken from a
`+` number.

## The country list

United States, Canada and United Kingdom come first, then a divider, then 240
other countries and territories in alphabetical order. The list, names and
placeholders are the same as TidyContact's, in
`src/scripts/e164-phone-countries.ts`.

The field placeholder is an example number for the selected country:
`(201) 555-0123` for the US, `07400 123456` for the UK.

Flags load from flagcdn.com. If one fails to load, the two-letter country code
(`GB`) shows in its place.

### Keyboard

| Key                  | What it does                                  |
|----------------------|-----------------------------------------------|
| Enter, Space, ↑ or ↓ | Opens the list                                |
| ↑, ↓, Home, End      | Moves through the list                        |
| Enter or Space       | Picks the highlighted country                 |
| Escape               | Closes the list and returns focus to the flag |
| Tab                  | Closes the list                               |

There is no type-to-search.

## Typing a number

The field is never rewritten while the supporter types. A number starting
with `+`, `(+` or `00` switches the flag as soon as its calling code is complete:
`+4` leaves the flag alone, `+44` switches it to the UK.

### Shared calling codes

Some calling codes cover more than one country. `+1` is the US, Canada and
most of the Caribbean. `+44` is the UK, Jersey, Guernsey and the Isle of Man.
If the selected country already uses the typed code, it stays. Otherwise the
flag switches to the main country for that code:

| Code   | Country        |
|--------|----------------|
| `+1`   | United States  |
| `+7`   | Russia         |
| `+39`  | Italy          |
| `+44`  | United Kingdom |
| `+47`  | Norway         |
| `+61`  | Australia      |
| `+212` | Morocco        |
| `+262` | Réunion        |
| `+358` | Finland        |
| `+590` | Guadeloupe     |
| `+599` | Curaçao        |

So `+1 416 555 0123` shows the US flag unless Canada was already selected.
The submitted number is the same either way.

## What gets submitted

EN checks the phone field before this component converts anything. On submit,
EN runs its own validation first, including the regex set on the phone field.
Only when every check passes does it call ENgrid's submit hook, where the
number is converted. If the regex fails, EN shows "Please enter a valid phone
number" under the field and nothing is converted or sent.

### Conversion

1. An extension at the end (`ext 12`, `x12`) and a UK-style `(0)` are removed.
2. A number with a `+` before its first digit becomes `+` and its digits.
   The `+` can follow a bracket, as in `(+44) 7400 123456`.
3. A number starting with `00` becomes `+` and the digits after `00`.
4. Any other number is national. Its trunk prefix is removed, then the
   selected country's dial code is added.

The trunk prefix is the digit a country's numbers start with when dialled
from inside the country. It's `0` in most countries, `1` across the `+1`
countries, `8` in Russia, Belarus, Kazakhstan and Turkmenistan, and `06` in
Hungary. About 100 countries have none, and there a leading `0` is part of the
number: Italy, Vatican City, San Marino, Côte d'Ivoire, Congo and Gabon among
them. The prefixes come from libphonenumber's metadata, copied into the
country list once.

A value with no digits becomes empty. The conversion never blocks submission
or adds an error, so a number that isn't real reaches EN in E.164 shape.
Analytics and SMS handlers that read the field after this point get the E.164
value too.

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
almost everywhere. A few small territories with 4 to 6 digit numbers, such as
Andorra, the Faroe Islands and Saint Helena, fail unless entered with their
`+` code. The regex doesn't know the selected country, so a US number missing
its area code (`555-0124`) passes.

| Field at submit     | Selected      | EN regex | EN receives         |
|---------------------|---------------|----------|---------------------|
| `(201) 555-0124`    | United States | Passes   | `+12015550124`      |
| `07400 123456`      | UK            | Passes   | `+447400123456`     |
| `+44 7400 123456`   | any           | Passes   | `+447400123456`     |
| `06 12 34 56 78`    | France        | Passes   | `+33612345678`      |
| `0412 345 678`      | Australia     | Passes   | `+61412345678`      |
| (empty)             | any           | Passes   | (empty)             |
| `555-0124`          | United States | Passes   | `+15550124`         |
| `201`, `+999123`    | any           | Fails    | nothing             |
| `2015550124123456`  | any           | Fails    | nothing             |
| `Tel: 07400 123456` | UK            | Fails    | nothing             |

### Pages on the old regex

TNC pages were set up with this regex (pages 200334 and 205802 both have it):

```
^(?:((\+?\d{2,3})|(\(\+?\d{2,3}\))) ?)?(((\d{2}[\ -.]?){3,5}\d{2})|((\d{3}[\ -.]?){2}\d{4})|(\(?(\d{3})\)?([ .-]?)(\d{3})([ .-]?)(\d{4}))?)$
```

It's built around US and UK number shapes and rejects many real numbers, such
as Spanish, Australian, Brazilian and Indian ones. Any page still on this
regex needs its phone validation changed.

## Failed submissions

Before converting, the component saves the typed text, the country and the
page ID to session storage (`engrid_e164_phone_submission`). If the submission
fails, the field shows the number as it was typed, with its country, not the
E.164 value.

This covers both kinds of failure:

- **Errors shown on the same page**, through ENgrid's `onError` event and its
  error-list watcher
- **A full page reload with an error**, through EN's
  `checkSubmissionFailed()`, matched on page ID

The saved state is cleared once it's restored, on any page load that isn't a
failed submission, and as soon as the supporter edits the number. If session
storage is blocked, same-page errors still restore from memory.

## Limitations

- No check on length, numbering plan, ownership, or whether the number can take
  calls or texts.
- Argentine mobiles written the national way (`011 15-2345-6789`) are sent as
  `+54111523456789`. The correct E.164 form is `+5491123456789`, which needs
  Argentina's mobile rules.
- Exit codes other than `00`, such as `011` from the US, aren't recognised.
  The number is treated as national.
- A typed `+` code wins over the selector. Picking France while the field holds
  `+44 …` still sends `+44 …`.
- The flag for shared calling codes follows the table above, not the area
  code.
- IP location can be missing or wrong (travel, VPNs).
- Restoring after a failure depends on ENgrid's error hooks. A digital wallet
  cancel or an interrupted submit that raises no ENgrid error may leave the
  E.164 value in the field.

## Code

| File                                  | What it holds                                       |
|---------------------------------------|-----------------------------------------------------|
| `src/scripts/e164-phone.ts`           | The component, started in `src/index.ts`            |
| `src/scripts/e164-phone-countries.ts` | Country names, dial codes, trunk prefixes, examples |
| `src/sass/components/e164-phone.scss` | Selector and list styles                            |
| `src/scripts/main.js`                 | `updatePlaceholder` skips the enhanced phone field  |

The component adds `e164-phone--enhanced` to the field's
`.en__field__element` and `e164-phone--enhanced-form` to its form block, which
is useful for targeting styles.

## Testing

Add `?debug=log` to any page with the phone field. Each submit logs
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
