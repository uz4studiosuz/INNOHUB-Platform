# Asset credits

Every component graphic in this folder comes from the
[Fritzing parts library](https://github.com/fritzing/fritzing-parts)
(`svg/core/breadboard/`), licensed under
[Creative Commons Attribution-ShareAlike 3.0 Unported](https://creativecommons.org/licenses/by-sa/3.0/).
Per the Fritzing project's own license terms a simple credit is sufficient:
**"this image was created with Fritzing."**

Because these SVGs are dimensionally accurate, the editor scales all of them
through one pixels-per-inch constant (`src/components/electronics/units.ts`),
which is what keeps their sizes true relative to each other. Terminal
coordinates in `componentLibrary.ts` and `breadboard.ts` are likewise read out
of these very files, so the clickable pins land on the printed holes.

| File | Fritzing source | Changes |
| --- | --- | --- |
| `arduino-uno.svg` | `arduino_Uno_Rev3_breadboard.svg` | none |
| `breadboard.svg` | `halfBreadboard.svg` | none |
| `pushbutton.svg` | `basic_pbutton.svg` | none |
| `potentiometer.svg` | `potentiometer.svg` | none |
| `led-<colour>.svg` | `LED-5mm-red-leg.svg` | body tinted through the file's own `color_*` element ids, which is what Fritzing itself does per LED colour; bendable legs trimmed to a fixed length and the viewBox grown to fit them |
| `rgb-led.svg` | `led-rgb-4pin-anode-leg.svg` | legs trimmed, viewBox grown |
| `piezo.svg` | `piezo_sensor.svg` | viewBox grown so the leads stay visible |
| `servo-body.svg`, `servo-horn.svg` | `servo.svg` | split in two, sharing one viewBox, so the horn can be rotated live over the body |

The resistor is drawn inline in `ComponentView.tsx` rather than served from
here: it reuses the paths from Fritzing's `resistor_220.svg` but recolours the
bands to whatever resistance the part is set to.
