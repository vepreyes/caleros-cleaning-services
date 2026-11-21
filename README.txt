Freshbrook — Free Cleaning Service Website Template by uiCookies
https://uicookies.com/

Freshbrook is a free website template for a home and office cleaning company
that also cleans carpets and upholstery, built on Bootstrap 5. The demo is the
fictional Freshbrook Cleaning Co. in Larkfield, in brook teal, mint and lemon
on white with Gabarito headings and Nunito Sans text. Visitors can price a
clean on the homepage quote card or the full calculator (service, bedrooms,
bathrooms, extras, carpet rooms, frequency discount), then book a date and
arrival window with access notes and pet details. A carpet and upholstery
page has a before and after slider that works with mouse, touch and keyboard.
Everything runs on one vanilla JavaScript file with no jQuery; content stays
visible without JavaScript and motion respects prefers-reduced-motion.

Free for personal and commercial use. Attribution is optional but always welcome — https://uicookies.com/license/

WHAT'S INSIDE
  index.html            Home page: instant quote card, trust strip, five
                        services, how it works, room-by-room checklist tabs,
                        eco products note, guarantees and stats, reviews,
                        FAQ, call to action
  pricing.html          Quote calculator with a live line-item estimate,
                        base price table, add-on prices, pricing factors
  booking.html          Booking form: service, date, arrival window slots,
                        address, access notes, pets, contact details and a
                        confirmation panel
  carpet.html           Carpet & upholstery: before/after slider, what we
                        clean with prices, process, drying times, stain
                        first aid, FAQ
  contact.html          Contact methods, message form with office-cleaning
                        fields, illustrated service-area map, office hours
  css/vendor/           Bootstrap 5.3.8 (minified, self-hosted)
  css/style.css         Template design layer (palette, type, components)
  js/vendor/            Bootstrap 5.3.8 bundle (includes Popper)
  js/main.js            Template behaviour — vanilla JavaScript, no jQuery
  img/                  Demo photos (public domain, see CREDITS.txt)
  CREDITS.txt           Source and licence for every demo photo

NOTES
  - Colours, fonts and radii are CSS custom properties at the top of
    css/style.css. Change them there to rebrand the whole template.
  - Every price lives in the PRICES object at the top of js/main.js: base
    price per service, cost per extra bedroom and bathroom, add-ons and which
    services already include them, carpet room / stairs / seat rates, the
    carpet-only minimum and the frequency discounts. The homepage quote card,
    the calculator and the booking recap all read from it. The static price
    tables in pricing.html and the "from" prices on the cards are plain HTML,
    so update them to match.
  - The calculator passes its choices to booking.html in the URL
    (e.g. booking.html?service=deep&bed=3&bath=2&extras=oven&estimate=310),
    which prefills the booking form and shows a quote summary. Links such as
    pricing.html?service=carpet and contact.html?topic=office preselect a
    service or topic.
  - Arrival-window availability on booking.html is demo data worked out from
    the chosen date. Connect it to your scheduling software for real slots.
  - Forms are front-end only: they validate in the browser and show a
    success state, but nothing is sent. Point them at a form service or
    booking system before launch.
  - The "before" side of the comparison slider is the same photo with a CSS
    filter and stain overlay. Swap in your own real before and after photos
    (two images with the same framing) for a genuine result.
  - Replace the demo images in img/ with your own photos before launch.
