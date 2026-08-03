-- =============================================================================
-- Insert 7 new SEO pages: Trane TruComfort cluster + 3 project showcases + 1 educational
-- =============================================================================

-- 1. Trane TruComfort Variable Speed Dallas (Brand Pillar)
INSERT INTO seo_location_pages (
  url_slug, neighborhood, city, state, zip_code, cluster, page_type, h1_title,
  meta_title, meta_description, search_intent, audience, schema_enabled,
  schema_description, geography_tag, zip_tag, city_tag, service_tags, content,
  schema_json, published, add_to_service_areas_hub
) VALUES (
  '/trane-trucomfort-variable-speed-dallas/', 'Dallas', 'Dallas', 'TX', '75208',
  'Brand - Trane', 'Brand Pillar',
  'Trane TruComfort Variable Speed — Dallas TX Installer Guide',
  'Trane TruComfort Variable Speed Dallas | Truficient',
  'Trane TruComfort 18 and 20 SEER2 variable-speed AC and heat pump in Dallas TX. WeatherGuard top, R-454B, Hyperion air handler. Call 214-238-4349.',
  'commercial investigation', 'residential', true,
  'Trane TruComfort variable-speed AC and heat pump installation in Dallas TX. 18 and 20 SEER2, WeatherGuard hail protection, R-454B A2L refrigerant, Hyperion air handler.',
  'Dallas', '75208', 'Dallas', ARRAY['AC Installation','Heat Pump Installation','Variable-Speed HVAC'],
  $CONTENT$# Trane TruComfort Variable Speed — Dallas TX Installer Guide

**Truficient installs Trane TruComfort 18 and 20 SEER2 variable-speed systems in Dallas. Call [214-238-4349](tel:2142384349) or [request a quote online](#contact).**

## Why Truficient Only Installs Trane at the TruComfort Tier

Trane makes a full range of HVAC equipment from builder-grade single-stage up through their TruComfort variable-speed platform. Truficient installs Trane only as **18 SEER2 or 20 SEER2 TruComfort variable-speed systems** — no entry-level Trane, no single-stage, no two-stage. The reasoning is straightforward: if a homeowner is choosing Trane, they''re choosing a premium brand. That choice should come with premium technology. A single-stage Trane at 14.3 SEER2 performs no differently than any other single-stage system at that efficiency — you''d be paying for the name without getting the engineering that justifies it.

The TruComfort platform uses inverter-driven compressors that operate on the same principle as the Mitsubishi mini splits and Goodman GXV6SS systems that Truficient installs. The compressor modulates its speed continuously to match the actual cooling or heating load — running at 30% capacity on a mild spring evening, ramping to 80% during a 105°F July afternoon, and everywhere in between. The result is the same benefit we build our entire approach around: tighter temperature control, dramatically better humidity management, lower electrical consumption, and quieter operation.

The difference with Trane is what sits around the inverter. The WeatherGuard top protects the outdoor unit from hail damage — a genuine benefit in DFW, where hailstorms regularly total HVAC equipment across entire neighborhoods. The Hyperion air handler uses a variable-speed blower with ComfortLink II communicating controls to keep the indoor and outdoor components in sync. And the Trane name carries a service network and brand recognition that matters to homeowners who plan to sell their property and want a recognizable system on the home inspection report.

## How Trane TruComfort Extends Our Inverter Approach

Truficient''s entire product lineup — Mitsubishi ductless, Goodman variable-speed ducted, Trane TruComfort, and Bosch inverter — shares a single unifying technology: inverter-driven compressors. The brand and the form factor change. The operating principle does not.

Trane TruComfort is the **premium ducted option** for homeowners who need to keep their existing ductwork. If your home in Highland Park has a well-maintained duct system that was properly designed when the house was built, a Trane 5TTV0X drops into that system and delivers premium inverter performance without any ductwork demolition. If that same home has no ductwork or the existing ducts are in poor condition, Mitsubishi ductless is the better path. [See our ductless options →](/mitsubishi-mini-split-dallas/)

The decision tree is simple: **ducts in good shape + premium budget = Trane TruComfort. Ducts in good shape + moderate budget = Goodman GXV6SS. No ducts or bad ducts = Mitsubishi mini split.** All three are inverter. All three deliver the comfort and efficiency gains that matter in Dallas heat.

## TruComfort AC: The 5TTV0X and 5TTV8X

### 5TTV0X — 20 SEER2 TruComfort Variable-Speed AC (WeatherGuard Top)

The 5TTV0X is the flagship. The WeatherGuard top is a steel-reinforced protective grille that covers the top of the outdoor unit — the area most vulnerable to hail impact. In a metro where a single spring hailstorm can damage thousands of outdoor units across neighborhoods, this isn''t a cosmetic feature.

| Model | Tonnage | SEER2 (with Hyperion AH) | Refrigerant | Key Feature |
|---|---|---|---|---|
| 5TTV0X24A1000 | 2 Ton | up to ~22.0 | R-454B | WeatherGuard top |
| 5TTV0X36A1000 | 3 Ton | ~20.4 | R-454B | WeatherGuard top |
| 5TTV0X48A1000 | 4 Ton | ~20.2 | R-454B | WeatherGuard top |
| 5TTV0X60A1000 | 5 Ton | ~17.0–19.0 | R-454B | WeatherGuard top |

The 3-ton and 4-ton models are the sweet spot for most Dallas residential installations. A 2,000–2,800 square-foot home in Lakewood, University Park, or Preston Hollow typically lands in the 3-to-4-ton range depending on insulation quality, window exposure, and attic configuration.

### 5TTV8X — 18 SEER2 TruComfort Variable-Speed AC

The 5TTV8X is the same TruComfort inverter platform without the WeatherGuard top and at a slightly lower efficiency rating. It still delivers genuine variable-speed performance — the compressor modulation, humidity control, and quiet operation are identical in behavior.

## TruComfort Heat Pumps: The 5TWV0X and 5TWV8X

### 5TWV0X — 20 SEER2 TruComfort Variable-Speed Heat Pump (WeatherGuard Top)

The heat pump version of the 5TTV0X — same inverter compressor, same WeatherGuard top, with full heating and cooling capability. For homeowners pursuing electrification or dual-fuel configurations, this is the premium heat pump option for ducted homes.

| Model | Tonnage | SEER2 | HSPF2 (range) | Refrigerant |
|---|---|---|---|---|
| 5TWV0X24A1000 | 2 Ton | up to ~22.0 | ~9.7–10.0 | R-454B |
| 5TWV0X36A1000 | 3 Ton | ~20.4 | ~10.0–10.5 | R-454B |
| 5TWV0X48A1000 | 4 Ton | ~20.2–20.6 | ~9.7–10.0 | R-454B |
| 5TWV0X60A1000 | 5 Ton | ~17.0–19.0 | ~8.7–9.0 | R-454B |

The HSPF2 ratings in the 9.7–10.5 range mean the TruComfort heat pump delivers efficient heating down to temperatures that cover virtually all of a typical Dallas winter.

## Furnace and Air Handler Pairings

Trane''s variable-speed outdoor units need the right indoor partner to deliver their full performance range.

**S9V2U-VSB** — 97% AFUE, two-stage, variable-speed ECM blower. The premium Trane furnace match.

**5TAMX Hyperion Variable-Speed Air Handler** — Trane''s flagship air handler for heat pump pairings. The Hyperion uses a variable-speed blower with ComfortLink II communicating protocol.

## R-454B Refrigerant: Trane''s A2L Path

Trane''s TruComfort line uses R-454B — the same A2L refrigerant that Bosch has adopted across their mini split and ducted inverter lines. R-454B has a Global Warming Potential of 466, the lowest of the common residential HVAC refrigerants. Truficient''s team is A2L certified for both R-454B (Trane, Bosch) and R-32 (Goodman, Mitsubishi) systems.

## Where Trane TruComfort Fits Best in Dallas

**Premium neighborhoods with existing ductwork.** Highland Park, University Park, Preston Hollow, Bluffview, and Lakewood homes with well-designed, well-maintained duct systems are the natural fit for TruComfort.

**Hail-prone installations without overhead protection.** Any outdoor unit placement in DFW that''s exposed to the sky should seriously consider the 5TTV0X or 5TWV0X with WeatherGuard top.

**Resale-conscious homeowners.** The Trane name appears on home inspection reports in a way that communicates value to buyers.

## Trane Product and Comparison Pages: Go Deeper

- [5TWV0X Heat Pump — Dual-Fuel and All-Electric →](/trane-5twv0x-heat-pump-dallas/)
- [TruComfort Installation Highland Park →](/trane-trucomfort-highland-park-dallas/)

## Get a Trane TruComfort Quote for Your Dallas Home

Truficient installs Trane TruComfort systems throughout Dallas — Highland Park, University Park, Preston Hollow, Lakewood, Bluffview, Oak Lawn, Uptown, and surrounding neighborhoods. Every installation includes Manual J load calculation, duct verification, ComfortLink II commissioning, and full warranty registration.

**Call [214-238-4349](tel:2142384349)** to discuss Trane TruComfort for your home, or **[request a quote online](#contact)** for a site assessment.
$CONTENT$,
  '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com","telephone":"214-238-4349","address":{"@type":"PostalAddress","addressLocality":"Dallas","addressRegion":"TX","postalCode":"75208","addressCountry":"US"},"areaServed":{"@type":"City","name":"Dallas"},"description":"Trane TruComfort variable-speed AC and heat pump installation in Dallas TX. 18 and 20 SEER2, WeatherGuard hail protection, R-454B A2L refrigerant, Hyperion air handler.","priceRange":"$$$"}'::jsonb,
  true, true
);

-- 2. Trane TruComfort Highland Park (Neighborhood + Brand)
INSERT INTO seo_location_pages (
  url_slug, neighborhood, city, state, zip_code, cluster, page_type, h1_title,
  meta_title, meta_description, search_intent, audience, schema_enabled,
  schema_description, geography_tag, zip_tag, city_tag, service_tags, content,
  schema_json, published, add_to_service_areas_hub
) VALUES (
  '/trane-trucomfort-highland-park-dallas/', 'Highland Park', 'Dallas', 'TX', '75205',
  'Brand - Trane', 'Brand Spoke',
  'Trane TruComfort for Highland Park, Dallas',
  'Trane TruComfort Highland Park Dallas | Truficient',
  'Trane TruComfort 20 SEER2 variable-speed installation in Highland Park TX. 5TTV0X, 5TWV0X heat pump, WeatherGuard. Call 214-238-4349.',
  'commercial investigation', 'residential', true,
  'Trane TruComfort 5TTV0X and 5TWV0X variable-speed installation in Highland Park, Dallas TX. Premium inverter AC and heat pump for luxury homes.',
  'Highland Park', '75205', 'Dallas', ARRAY['AC Installation','Heat Pump Installation'],
  $CONTENT$# Trane TruComfort for Highland Park, Dallas

**Truficient installs Trane TruComfort 20 SEER2 systems in Highland Park and University Park. Call [214-238-4349](tel:2142384349) or [request a quote online](#contact).**

## Why Highland Park Homes Demand TruComfort-Tier Equipment

Highland Park isn''t a neighborhood where a contractor drops in a builder-grade system and moves on. The homes here — ranging from 1920s Tudor and Colonial Revival estates along Beverly Drive and Lakeside to mid-century modern renovations off Armstrong Parkway to new construction throughout — represent significant property investments where HVAC quality directly affects comfort, resale value, and long-term maintenance costs.

Most Highland Park homes currently running 15-to-20-year-old ducted systems are on aging Trane, Carrier, or Lennox equipment that was premium when installed. The replacement question isn''t whether to stay premium — it''s which premium technology to choose. The Trane TruComfort line is the natural upgrade path for homeowners who want to stay within the Trane ecosystem while stepping up from two-stage or single-stage to true variable-speed inverter operation.

The performance difference is not subtle. A 15-year-old two-stage Trane XR17 in a 3,500 square-foot Highland Park home operates at either 65% or 100% capacity — two gears. The TruComfort 5TTV0X inverter AC operates across a continuous range from approximately 25% to 100%, adjusting in real time to the actual load. On a 90°F May afternoon, it might run at 40% capacity for hours — holding the temperature within a degree of setpoint and pulling moisture from the air continuously. On a 107°F July peak, it ramps up as needed.

## The Heat Pump Case for Highland Park

Highland Park homeowners are increasingly evaluating heat pumps — not just for the environmental positioning (though that matters in this market) but for the operating economics and the simplification of having one system instead of two.

The **Trane 5TWV0X heat pump** in a dual-fuel configuration with the **S9V2U furnace** (97% AFUE) gives Highland Park homeowners the best of both worlds: electric heat pump operation handles 90–95% of heating days at 2.5–3x the efficiency of gas combustion, while the furnace provides seamless gas backup for the rare deep-freeze events.

For new construction in Highland Park — and there''s a significant amount of it — all-electric TruComfort heat pump configurations with the **Hyperion air handler** eliminate the gas line entirely. No gas meter, no combustion venting, no carbon monoxide risk.

## Model Selection for Highland Park Home Sizes

| Home Profile | Recommended System | Notes |
|---|---|---|
| 2,400–3,200 sq ft traditional | 5TTV0X36A1000 or 5TWV0X36A1000 (3-ton) + S9V2U | Single system covers most homes |
| 3,200–4,500 sq ft two-story | 5TTV0X48A1000 or 5TWV0X48A1000 (4-ton) + S9V2U | May need supplemental zoning |
| 4,500–6,000 sq ft estate | Dual 5TTV0X systems or 5TTV0X60A1000 (5-ton) + zoning | Multi-system approach preferred |
| 6,000+ sq ft | Custom multi-system design | TruComfort + Mitsubishi VRF combinations |

## WeatherGuard: A Real Benefit in Highland Park

Highland Park''s tree canopy provides some hail protection, but DFW hailstorms are severe enough to damage outdoor units even under partial tree cover. Both the TruComfort AC and heat pump include Trane''s WeatherGuard top — a steel-reinforced grille that protects the top of the outdoor unit from hail impact.

## Highland Park Installation Considerations

**Aesthetic requirements.** Highland Park has some of the most stringent expectations around equipment placement and visibility. The TruComfort outdoor units are compact relative to their capacity, and Truficient positions them in locations that minimize visual impact.

**Existing Trane equipment.** Many Highland Park homes already have Trane systems. Upgrading within the Trane family means the duct design, thermostat wiring, and indoor equipment mounting often carry over with minimal modification.

## Related Pages

- [Trane TruComfort — Full Dallas Brand Guide →](/trane-trucomfort-variable-speed-dallas/)
- [5TWV0X Heat Pump — Dual-Fuel and All-Electric →](/trane-5twv0x-heat-pump-dallas/)
- [Heat Pump Replacement Highland Park →](/heat-pump-replacement-highland-park-dallas/)
- [HVAC 75205 — Highland Park / University Park →](/hvac-75205/)

## Get a TruComfort Quote for Your Highland Park Home

Truficient installs Trane TruComfort systems throughout Highland Park and University Park. Every installation includes Manual J load calculation, duct verification, ComfortLink II commissioning, and full warranty registration.

**Call [214-238-4349](tel:2142384349)** or **[request a quote online](#contact).**
$CONTENT$,
  '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com","telephone":"214-238-4349","address":{"@type":"PostalAddress","addressLocality":"Highland Park","addressRegion":"TX","postalCode":"75205","addressCountry":"US"},"areaServed":{"@type":"GeoCircle","geoMidpoint":{"@type":"GeoCoordinates","latitude":32.8312,"longitude":-96.7972},"geoRadius":"4000"},"description":"Trane TruComfort 5TTV0X and 5TWV0X variable-speed installation in Highland Park, Dallas TX. Premium inverter AC and heat pump for luxury homes.","priceRange":"$$$"}'::jsonb,
  true, true
);

-- 3. Trane 5TWV0X Heat Pump Dallas (Product Detail)
INSERT INTO seo_location_pages (
  url_slug, neighborhood, city, state, zip_code, cluster, page_type, h1_title,
  meta_title, meta_description, search_intent, audience, schema_enabled,
  schema_description, geography_tag, zip_tag, city_tag, service_tags, content,
  schema_json, published, add_to_service_areas_hub
) VALUES (
  '/trane-5twv0x-heat-pump-dallas/', 'Dallas', 'Dallas', 'TX', '75208',
  'Brand - Trane', 'Brand Spoke',
  'Trane TruComfort Heat Pump — 5TWV0X and 5TWV8X Dallas Installation Guide',
  'Trane 5TWV0X Heat Pump Dallas | Truficient Installer',
  'Trane TruComfort 5TWV0X 20 SEER2 variable-speed heat pump in Dallas TX. R-454B, WeatherGuard, Hyperion AH. Call 214-238-4349.',
  'commercial investigation', 'residential', true,
  'Trane TruComfort 5TWV0X and 5TWV8X variable-speed inverter heat pump installation in Dallas TX. 20 SEER2, WeatherGuard hail protection, R-454B, dual-fuel and all-electric.',
  'Dallas', '75208', 'Dallas', ARRAY['Heat Pump Installation','Dual Fuel'],
  $CONTENT$# Trane TruComfort Heat Pump — 5TWV0X and 5TWV8X Dallas Installation Guide

**Truficient installs Trane TruComfort heat pumps in dual-fuel and all-electric configurations across Dallas. Call [214-238-4349](tel:2142384349) or [request a quote online](#contact).**

## The Premium Path to Electrification

If you''re a Dallas homeowner evaluating heat pumps and your priority is premium equipment with a recognizable brand name, the Trane TruComfort heat pump line — the 5TWV0X (20 SEER2) and 5TWV8X (18 SEER2) — is the specification to evaluate. These are not repackaged air conditioners with a reversing valve added as an afterthought. They are purpose-built inverter heat pumps on Trane''s TruComfort platform, running R-454B refrigerant, with the same WeatherGuard hail protection and ComfortLink II communicating controls as the TruComfort AC line.

The heat pump conversation in Dallas is ultimately about one thing: getting off natural gas for heating without sacrificing comfort or reliability. A heat pump moves heat rather than creating it from combustion — delivering 2 to 3 times more heating energy per kilowatt consumed than any electric resistance heater, and doing it without burning a single therm of gas.

## 5TWV0X: 20 SEER2 TruComfort Heat Pump (WeatherGuard Top)

The 5TWV0X is Trane''s flagship residential heat pump — the highest efficiency, most feature-complete ducted inverter heat pump in their lineup.

| Model Number | Tonnage | Cooling SEER2 | Heating HSPF2 | Refrigerant | Protection |
|---|---|---|---|---|---|
| 5TWV0X24A1000 | 2 Ton | up to ~22.0 | ~9.7–10.0 | R-454B | WeatherGuard top |
| 5TWV0X36A1000 | 3 Ton | ~20.4 | ~10.0–10.5 | R-454B | WeatherGuard top |
| 5TWV0X48A1000 | 4 Ton | ~20.2–20.6 | ~9.7–10.0 | R-454B | WeatherGuard top |
| 5TWV0X60A1000 | 5 Ton | ~17.0–19.0 | ~8.7–9.0 | R-454B | WeatherGuard top |

**HSPF2 ratings of 9.7–10.5** mean the 5TWV0X delivers efficient heating well below the temperatures that Dallas experiences in a normal winter. At 45°F outdoor temperature — a typical January day in Dallas — the heat pump operates at close to peak heating efficiency.

**The WeatherGuard top** is Trane''s steel-reinforced protective grille covering the top of the outdoor unit. For a heat pump that runs year-round (not just cooling season), this protection is even more relevant than on an AC-only unit.

**Warranty:** 12-year registered compressor warranty, 10-year outdoor coil and parts.

## 5TWV8X: 18 SEER2 TruComfort Heat Pump

The 5TWV8X delivers the same TruComfort inverter heat pump performance at the 18 SEER2 tier — same variable-speed compressor behavior, same R-454B refrigerant, same ComfortLink II communication, without the WeatherGuard top.

## Air Handler Pairings: The Indoor Side of a Heat Pump System

### 5TAMX Hyperion Variable-Speed Air Handler

The Hyperion is Trane''s flagship air handler and the unit Truficient specifies for all premium TruComfort heat pump installations. The variable-speed ECM blower adjusts airflow continuously to match the heat pump''s modulating output.

The Hyperion includes auxiliary electric heat strips as emergency backup. In an all-electric configuration, these strips provide resistance heating when outdoor temperatures drop below the heat pump''s economical operating range.

### 5TEMC Link Variable-Speed Air Handler

Trane''s secondary communicating air handler. Capable variable-speed blower with ComfortLink II protocol, at a lower price point than the Hyperion.

## Dual-Fuel Option: 5TWV0X + Trane Gas Furnace

For homeowners who want heat pump efficiency but aren''t ready to disconnect gas entirely, the 5TWV0X pairs with Trane''s gas furnaces:

**S9V2U-VSB** (97% AFUE, two-stage, variable-speed ECM) — The premium furnace match.

**S8V2-CB** (80% AFUE, two-stage, variable-speed ECM) — The 80% tier for installations where high-efficiency venting isn''t practical.

## Why Heat Pumps Beat Gas Furnaces for Dallas Homeowners

**Per-BTU heating cost is lower.** At current Texas electricity rates and natural gas rates, a heat pump with a COP of 2.8 delivers heat at roughly 40–50% lower cost per BTU than a 96% gas furnace in temperatures above 35°F.

**Eliminates combustion risk.** No gas valve, no heat exchanger, no CO risk.

**One system, two seasons.** The 5TWV0X handles both cooling and heating.

## Related Pages

- [Trane TruComfort — Full Dallas Brand Guide →](/trane-trucomfort-variable-speed-dallas/)
- [Trane TruComfort Highland Park →](/trane-trucomfort-highland-park-dallas/)
- [Heat Pump in Texas — Does It Work in a Freeze? →](/heat-pump-texas-winter-freeze-performance/)

## Get a TruComfort Heat Pump Quote

Truficient installs Trane TruComfort heat pumps throughout Dallas. Every installation includes Manual J load calculation, duct verification, ComfortLink II commissioning, balance point calibration, and full warranty registration.

**Call [214-238-4349](tel:2142384349)** or **[request a quote online](#contact).**
$CONTENT$,
  '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com","telephone":"214-238-4349","address":{"@type":"PostalAddress","addressLocality":"Dallas","addressRegion":"TX","postalCode":"75208","addressCountry":"US"},"areaServed":{"@type":"City","name":"Dallas"},"description":"Trane TruComfort 5TWV0X and 5TWV8X variable-speed inverter heat pump installation in Dallas TX. 20 SEER2, WeatherGuard hail protection, R-454B, dual-fuel and all-electric.","priceRange":"$$$"}'::jsonb,
  true, true
);

-- 4. Project Showcase: Trane Highland Park
INSERT INTO seo_location_pages (
  url_slug, neighborhood, city, state, zip_code, cluster, page_type, h1_title,
  meta_title, meta_description, search_intent, audience, schema_enabled,
  schema_description, geography_tag, zip_tag, city_tag, service_tags, content,
  schema_json, published, add_to_service_areas_hub
) VALUES (
  '/project/trane-highland-park-trucomfort-upgrade/', 'Highland Park', 'Dallas', 'TX', '75205',
  'Project Showcases', 'Project Showcase',
  'Project Showcase: Highland Park Estate — Two-Stage Trane to TruComfort Inverter Upgrade',
  'Trane TruComfort Install Highland Park | Truficient',
  'See how Truficient installed a Trane 5TTV0X48A1000 TruComfort system in a Highland Park estate. Real Dallas project from a premium inverter specialist.',
  'commercial investigation', 'residential', true,
  'Real project: Trane TruComfort 5TTV0X48A1000 installation in a Highland Park estate, replacing aging two-stage Trane.',
  'Highland Park', '75205', 'Dallas', ARRAY['AC Installation','Project Showcase'],
  $CONTENT$# Project Showcase: Highland Park Estate — Two-Stage Trane to TruComfort Inverter Upgrade

**Truficient installs Trane TruComfort systems in Highland Park. Call [214-238-4349](tel:2142384349) or [request a quote online](#contact).**

## The Home

**Location:** Highland Park, Dallas TX (75205)
**Home type:** Tudor Revival estate, approximately 3,500 square feet
**Stories:** Two story
**Ductwork:** Professionally installed metal trunk-and-branch
**Previous system:** Trane XR17, two-stage, R-410A, approximately 14 years old

## What the Homeowner Was Experiencing

The two-stage XR17 had been the premium Trane option when it was installed — but after 14 years it was cycling between low and high stage too frequently and losing humidity control on mild Dallas afternoons. The homeowner noticed bedroom temperatures running 4–5°F warmer than the main floor, and humidity levels in the 60% range during shoulder seasons. Outdoor unit noise was also a concern given proximity to the patio entertaining area.

## Truficient''s Assessment and Design

**Manual J load calculation:** 4-ton requirement — slightly under what the existing 5-ton system provided, confirming the original install was oversized.

**Duct evaluation:** Original metal ductwork was in excellent condition with only minor sealing needed at the plenum connections.

**Equipment placement:** Outdoor unit relocated to side yard with landscape screening to address patio noise concerns and meet aesthetic expectations.

## The System Installed

**Outdoor unit:** Trane 5TTV0X48A1000 — 4-ton, 20 SEER2, TruComfort variable-speed inverter AC, R-454B, WeatherGuard top

**Indoor unit:** Trane S9V2U-VSB — 97% AFUE, two-stage, variable-speed ECM gas furnace

**Controls:** ComfortLink II communicating thermostat — full system communication between outdoor unit, furnace, and thermostat

### Why This Configuration

The 4-ton sizing matched the actual Manual J load rather than the legacy 5-ton install. The 20 SEER2 5TTV0X tier was justified by the homeowner''s long-term ownership horizon and proven willingness to invest in premium equipment. The S9V2U furnace was the natural pairing for a Highland Park home where 97% AFUE gas heating makes sense given existing gas infrastructure.

## The TruComfort Difference: What Changed for This Homeowner

**Temperature stability:** The home now holds within 1°F of setpoint room-to-room, eliminating the previous 4–5°F bedroom variance.

**Humidity control:** Indoor humidity stabilized in the 45–50% range during shoulder seasons — down from 60%+.

**Sound:** Outdoor unit at typical 40–60% capacity is dramatically quieter than the previous high-stage XR17.

**Energy:** First full summer projected to deliver 25–30% lower cooling costs based on the SEER improvement from ~14 to 20.4.

## What This Project Shows About Highland Park HVAC Replacement

Highland Park homes deserve more than a box-swap. The difference between a TruComfort system installed by a contractor who does Manual J calculations, verifies duct sizing, commissions ComfortLink II, and calibrates airflow — versus a contractor who installs the same box and walks away — is the difference between a system that transforms the home''s comfort and one that underperforms its spec sheet.

Key takeaways:
1. **Manual J matters even in well-built homes** — the previous 5-ton system was oversized.
2. **The WeatherGuard earns its keep** for unprotected outdoor unit placements.
3. **Inverter modulation changes how the house feels** — temperature, humidity, and quiet.
4. **Staying within the Trane family simplified the upgrade** — duct compatibility, thermostat wiring, ComfortLink integration.

## Related Pages

- [Trane TruComfort — Full Dallas Brand Guide →](/trane-trucomfort-variable-speed-dallas/)
- [Trane TruComfort Highland Park →](/trane-trucomfort-highland-park-dallas/)
- [5TWV0X Heat Pump Option →](/trane-5twv0x-heat-pump-dallas/)
- [HVAC 75205 →](/hvac-75205/)

## Is Your Highland Park Home Ready for TruComfort?

**Call [214-238-4349](tel:2142384349)** or **[request a quote online](#contact).**
$CONTENT$,
  '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com","telephone":"214-238-4349","address":{"@type":"PostalAddress","addressLocality":"Highland Park","addressRegion":"TX","postalCode":"75205","addressCountry":"US"},"areaServed":{"@type":"GeoCircle","geoMidpoint":{"@type":"GeoCoordinates","latitude":32.8312,"longitude":-96.7972},"geoRadius":"4000"},"description":"Real project: Trane TruComfort 5TTV0X48A1000 installation in a Highland Park estate, replacing aging two-stage Trane.","priceRange":"$$$"}'::jsonb,
  true, true
);

-- 5. Project Showcase: Goodman Oak Cliff Bungalow
INSERT INTO seo_location_pages (
  url_slug, neighborhood, city, state, zip_code, cluster, page_type, h1_title,
  meta_title, meta_description, search_intent, audience, schema_enabled,
  schema_description, geography_tag, zip_tag, city_tag, service_tags, content,
  schema_json, published, add_to_service_areas_hub
) VALUES (
  '/project/goodman-oak-cliff-bungalow-r22-upgrade/', 'Oak Cliff', 'Dallas', 'TX', '75208',
  'Project Showcases', 'Project Showcase',
  'Project Showcase: Oak Cliff Bungalow — R-22 System to Goodman GXV6SS Inverter',
  'Goodman GXV6SS Install Oak Cliff Bungalow | Truficient',
  'See how Truficient replaced an R-22 system with a Goodman GXV6SS3610A inverter AC in an Oak Cliff bungalow. Real Dallas project, real results.',
  'commercial investigation', 'residential', true,
  'Real project: Goodman GXV6SS3610A inverter AC installation in an Oak Cliff bungalow, replacing a 20-year-old R-22 system.',
  'Oak Cliff', '75208', 'Dallas', ARRAY['AC Installation','Project Showcase'],
  $CONTENT$# Project Showcase: Oak Cliff Bungalow — R-22 System to Goodman GXV6SS Inverter

**Truficient installs Goodman variable-speed systems across Oak Cliff. Call [214-238-4349](tel:2142384349) or [request a quote online](#contact).**

## The Home

**Location:** Oak Cliff, Dallas TX (75208)
**Home type:** 1940s Craftsman bungalow, approximately 1,650 square feet
**Foundation:** Pier-and-beam
**Ductwork:** Metal trunk-and-branch in attic, original install with leakage at connections
**Previous system:** 3-ton single-stage AC, R-22 refrigerant, approximately 22 years old

## What the Homeowner Was Dealing With

The old R-22 system had leaked refrigerant twice in the past three years — the homeowner was paying $120 per pound for R-22 recharges as supply continues to shrink post-2020 phase-out. Annual recharge cost was running $400–$600 plus diagnostic fees. Comfort had degraded: humidity in the high 60s during summer, uneven cooling between front and back rooms, and the outdoor unit running at full capacity for hours on hot afternoons.

## What Truficient Found During the Assessment

**Load calculation results:** Manual J showed 2.5 tons required — less than the existing 3-ton system, confirming original oversizing common in older Oak Cliff installations.

**Duct assessment:** Serviceable metal ducts with leakage at connections. Sealed and verified — no replacement needed.

**Electrical panel:** Existing 200A service was adequate. No upgrade required.

**Installation challenges:** Tight side yard required the side-discharge GXV6SS form factor.

## The System We Installed

**Outdoor unit:** Goodman GXV6SS3610A — 3-ton variable-speed inverter AC, R-32 refrigerant, side-discharge

**Indoor unit:** Goodman GRVT96 — 96% AFUE, two-stage, variable-speed ECM gas furnace

**Additional work:** Duct sealing at all plenum and branch connections, condensate line replacement, equipment pad with vibration isolation

### Why This Configuration

Sized at 3-ton (above the Manual J 2.5-ton calculation) to provide modulation headroom — the inverter rarely runs above 70%, but having the additional capacity available means quieter operation at typical loads. The GRVT96 96% AFUE was justified by the gas heating bills the homeowner was already paying. Side-discharge form factor was essential for the narrow side yard placement.

## The R-22 to R-32 Transition

This home''s old system ran on R-22 — phased out of production in January 2020. The homeowner had been paying $120/lb for R-22 recharges. The Goodman inverter runs on R-32 — a current-generation refrigerant with a 68% lower Global Warming Potential than R-410A. The switch eliminates the recurring recharge cost and puts the home on a refrigerant platform with a 15+ year production horizon.

The line set was replaced — R-32 operates at higher pressures than R-22, so reusing the legacy line set wasn''t advisable.

## The Results

**Comfort:** Indoor humidity now runs 48–52% during summer — down from 65%+. Front-to-back temperature variance dropped from 4°F to under 1°F.

**Energy:** First summer''s electric bill was approximately 30% lower than the previous summer''s with the R-22 system.

**R-22 cost elimination:** $400–$600/year in recharge costs eliminated permanently.

## What This Project Demonstrates

This is a common Oak Cliff scenario: a homeowner with a 15-to-25-year-old R-22 system in a well-built older home with serviceable ductwork. The right answer isn''t always a ductless mini split — when the ducts are solid, the Goodman variable-speed AC delivers inverter performance through the existing duct system at a lower total project cost than a multi-zone ductless installation.

Key factors that made this a Goodman ducted project:
1. Existing metal ductwork in good condition
2. Homeowner preference for no visible indoor units
3. Budget priority — inverter performance at the most accessible price point
4. Side-discharge form factor fit the narrow side yard

## Related Pages

- [Goodman Variable Speed — Full Dallas Brand Guide →](/goodman-variable-speed-dallas/)
- [HVAC for 1940s Bungalows Oak Cliff →](/hvac-1940s-bungalow-oak-cliff-dallas/)
- [HVAC 75208 →](/hvac-75208/)

## Your Oak Cliff Home Could Be Next

**Call [214-238-4349](tel:2142384349)** or **[request a quote online](#contact).**
$CONTENT$,
  '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com","telephone":"214-238-4349","address":{"@type":"PostalAddress","addressLocality":"Oak Cliff","addressRegion":"TX","postalCode":"75208","addressCountry":"US"},"areaServed":{"@type":"GeoCircle","geoMidpoint":{"@type":"GeoCoordinates","latitude":32.7357,"longitude":-96.8431},"geoRadius":"5000"},"description":"Real project: Goodman GXV6SS3610A inverter AC installation in an Oak Cliff bungalow, replacing a 20-year-old R-22 system.","priceRange":"$$"}'::jsonb,
  true, true
);

-- 6. Project Showcase: Bosch Oak Cliff Dual-Fuel
INSERT INTO seo_location_pages (
  url_slug, neighborhood, city, state, zip_code, cluster, page_type, h1_title,
  meta_title, meta_description, search_intent, audience, schema_enabled,
  schema_description, geography_tag, zip_tag, city_tag, service_tags, content,
  schema_json, published, add_to_service_areas_hub
) VALUES (
  '/project/bosch-oak-cliff-dual-fuel-install/', 'Oak Cliff', 'Dallas', 'TX', '75208',
  'Project Showcases', 'Project Showcase',
  'Project Showcase: Oak Cliff — Bosch IDS Dual-Fuel Heat Pump Installation',
  'Bosch Dual-Fuel Install Oak Cliff Dallas | Truficient',
  'Real project: Bosch IDS heat pump + BGH96 dual-fuel installation in an Oak Cliff home. Quiet operation, 85% gas reduction. Call 214-238-4349.',
  'commercial investigation', 'residential', true,
  'Real project: Bosch IDS inverter heat pump + BGH96 dual-fuel installation in Oak Cliff, Dallas TX.',
  'Oak Cliff', '75208', 'Dallas', ARRAY['Heat Pump Installation','Dual Fuel','Project Showcase'],
  $CONTENT$# Project Showcase: Oak Cliff — Bosch IDS Dual-Fuel Heat Pump Installation

**Truficient installs Bosch dual-fuel systems in Oak Cliff. Call [214-238-4349](tel:2142384349) or [request a quote online](#contact).**

## The Home

**Location:** Oak Cliff, Dallas TX (75208)
**Sub-neighborhood:** Winnetka Heights
**Home type:** 1925 Craftsman bungalow, approximately 1,900 square feet
**Foundation:** Pier-and-beam
**Ductwork:** Metal trunk-and-branch in attic, well-maintained
**Previous system:** 3.5-ton single-stage AC + 80% gas furnace, approximately 16 years old

## Why This Homeowner Chose Bosch Over Goodman

The homeowner initially expected to install Goodman based on price. Two factors shifted the recommendation:

1. **Outdoor unit proximity to neighbor.** The only viable outdoor unit placement was 8 feet from the neighbor''s bedroom window. Sound was the deciding factor — the Bosch IDS at typical operating capacity is measurably quieter than the Goodman.
2. **Electrification interest.** The homeowner wanted a credible path off natural gas. The Bosch IDS dual-fuel integration with the BGH96 furnace provides that path while keeping gas as a backup during freeze events.

## The Noise Factor

The previous outdoor unit ran at 72–76 dB at the property line during high-stage operation. Neighbor relations had become strained. The Bosch IDS Premium tier at typical 40–60% modulation runs at 56–62 dB at the same property line — quieter than typical conversation. The neighbor specifically commented on the difference within the first week.

## The System Installed

**Outdoor unit:** Bosch IDS Premium 3-ton heat pump, R-454B
**Indoor unit:** Bosch BGH96 — 96% AFUE, two-stage, variable-speed ECM gas furnace
**Configuration:** Dual-fuel — heat pump primary, gas furnace backup below 32°F balance point
**Controls:** Bosch communicating thermostat with full system integration

### The Engineering Decisions

**Why IDS Premium tier:** Sound was the priority — the Premium tier delivers the quietest outdoor operation in Bosch''s residential heat pump lineup.

**Why dual-fuel over all-electric:** Homeowner wanted gas backup available during grid stress events (post-Uri concern). Dual-fuel preserves both fuel sources.

**Sizing:** Manual J calculated 3 tons — same as old system, which was actually correctly sized originally.

**Balance point calibration:** Set at 32°F. Heat pump handles all heating above 32°F; furnace activates below.

## The Gas-to-Electric Transition: What Changed

**Before (gas furnace heating):**
- Winter gas bill: ~$180/month average across November–March
- Winter gas consumption: ~140 therms/month
- CO₂ from gas heating: ~8,200 lbs/winter

**After (Bosch dual-fuel, first winter):**
- Winter gas bill: ~$25/month average (furnace ran approximately 14 days total)
- Winter gas consumption: ~18 therms/month average
- Gas reduction: ~87%
- Electricity increase for heat pump heating: ~$60/month
- Net operating cost reduction: ~$95/month during heating season
- CO₂ reduction: approximately 5,800 lbs/winter

## Comfort and Sound Assessment

**Temperature stability:** Inverter modulation maintains setpoint within 1°F across the whole house — previously the front rooms ran 3°F warmer than the back during summer.

**Humidity:** Summer humidity dropped from 62% average to 48% with the modulating compressor running longer at lower capacity.

**Sound — outdoor:** Measurable 14+ dB reduction at the property line. Neighbor relations significantly improved.

**Sound — indoor:** The variable-speed ECM blower runs at low speed for extended periods — significantly quieter than the previous fixed-speed blower.

## What This Project Demonstrates for Oak Cliff

This installation represents a specific niche within Oak Cliff''s HVAC replacement market: homeowners who want inverter efficiency, care about sound impact on their neighbors, and are motivated to reduce gas consumption. Not every Oak Cliff homeowner falls into this category — Goodman variable-speed remains the right answer for budget-focused replacements, and Mitsubishi ductless remains right for homes without ductwork.

But for the homeowner who values engineering quality, quiet operation, and an integrated path off natural gas, the Bosch dual-fuel configuration addresses all three in a single system.

## Related Pages

- [Bosch Inverter Ducted — Full Dallas Brand Guide →](/bosch-inverter-ducted-dallas/)
- [Bosch Dual-Fuel Heat Pump — How It Works →](/bosch-dual-fuel-heat-pump-dallas/)
- [HVAC 75208 →](/hvac-75208/)

## Is Bosch Dual-Fuel Right for Your Oak Cliff Home?

**Call [214-238-4349](tel:2142384349)** or **[request a quote online](#contact).**
$CONTENT$,
  '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com","telephone":"214-238-4349","address":{"@type":"PostalAddress","addressLocality":"Oak Cliff","addressRegion":"TX","postalCode":"75208","addressCountry":"US"},"areaServed":{"@type":"GeoCircle","geoMidpoint":{"@type":"GeoCoordinates","latitude":32.7357,"longitude":-96.8431},"geoRadius":"5000"},"description":"Real project: Bosch IDS inverter heat pump + BGH96 dual-fuel installation in Oak Cliff, Dallas TX.","priceRange":"$$"}'::jsonb,
  true, true
);

-- 7. Heat Pump Texas Winter Freeze Performance (Educational)
INSERT INTO seo_location_pages (
  url_slug, neighborhood, city, state, zip_code, cluster, page_type, h1_title,
  meta_title, meta_description, search_intent, audience, schema_enabled,
  schema_description, geography_tag, zip_tag, city_tag, service_tags, content,
  schema_json, published, add_to_service_areas_hub
) VALUES (
  '/heat-pump-texas-winter-freeze-performance/', 'Dallas', 'Dallas', 'TX', '75208',
  'Technical Education', 'Educational',
  'Heat Pump in a Texas Winter: Does It Actually Work in a Freeze?',
  'Heat Pump in Texas Winter — Does It Work? | Truficient',
  'Can a heat pump handle a Texas freeze? Yes. Here''s the engineering, the real performance data, and why Dallas is ideal for heat pumps. Call 214-238-4349.',
  'informational', 'residential', true,
  'Engineering analysis of inverter heat pump performance in Dallas winter conditions.',
  'Dallas', '75208', 'Dallas', ARRAY['Heat Pump Installation','Education'],
  $CONTENT$# Heat Pump in a Texas Winter: Does It Actually Work in a Freeze?

**Truficient installs inverter heat pumps for Dallas heating. Call [214-238-4349](tel:2142384349) or [request a quote online](#contact).**

## The Question Every Dallas Homeowner Asks

"What happens when it freezes?"

It''s the first question — and it''s the right question. Winter Storm Uri in February 2021 left millions of Texans without power and heat for days. The memory of pipes bursting, homes dropping to 40°F indoors, and a power grid that couldn''t keep up is recent enough that any Dallas homeowner evaluating a heat pump needs a direct, engineering-based answer to this question. Not marketing language. Not glossing over the concern. The actual physics and the practical implications.

Here''s the short answer: **A modern inverter heat pump works well in a Texas winter. The question is what happens during a grid failure during an extreme freeze — and that''s a question about the grid, not the heat pump.**

## How a Heat Pump Heats: The Physics

A heat pump doesn''t generate heat. It moves heat from outdoor air to indoor air using a refrigerant cycle — the exact same process your air conditioner uses in summer, but running in reverse.

Even when it''s 30°F outside, there is thermal energy in the air. A heat pump extracts that energy, concentrates it through compression, and delivers it indoors. The Coefficient of Performance (COP) measures how efficiently the heat pump does this:

- At 47°F outdoor (a typical Dallas December day): COP of approximately **3.0–3.5**. For every 1 kilowatt of electricity, it delivers 3.0–3.5 kilowatts of heat. A gas furnace at 96% AFUE has a COP equivalent of approximately 0.96. The heat pump is 3x more efficient.
- At 35°F outdoor (a cold Dallas January night): COP of approximately **2.5–3.0**.
- At 17°F outdoor (a rare Dallas freeze): COP of approximately **1.5–2.0**. Still more efficient than electric resistance heat. Dual-fuel systems switch to the gas furnace at this point.
- At 0°F and below: COP drops further. Most inverter heat pumps will still run.

**The key insight:** Dallas doesn''t live at 0°F. Dallas lives at 35°F–55°F during heating season. A heat pump''s best performance range (COP 2.5–3.5) aligns almost perfectly with Dallas''s actual winter temperatures.

## Dallas Winter by the Numbers

**Average heating season temperatures (November–March, Dallas Love Field data):**
- Days above 50°F: approximately 60–70 per heating season
- Days 35°F–50°F: approximately 40–50 per heating season
- Days 20°F–35°F: approximately 10–20 per heating season
- Days below 20°F: approximately 2–5 per heating season

**Total heating days below 32°F: approximately 15–25 per winter.** The other 120+ heating days are handled entirely by the heat pump on electricity, at 2.5 to 3.5 times the efficiency of gas.

## What Happens During a Freeze Event: Hour by Hour

**6 PM — 42°F.** Heat pump runs at ~50% capacity, COP ~3.0.
**10 PM — 34°F.** Heat pump ramps to ~70% capacity. COP ~2.7.
**2 AM — 28°F.** Dual-fuel may switch to gas furnace at 30–35°F balance point.
**6 AM — 24°F (low point).** Gas furnace running. Home stays comfortable. Gas usage: 1–2 therms.
**10 AM — 35°F, rising.** System switches back to heat pump.

**Total gas used for this freeze event:** 2–4 therms. Compare to a gas-only furnace burning gas all day, including during the 42°F evening when a heat pump would have been 3x more efficient.

## The Winter Storm Uri Question

Uri was different. It wasn''t a cold night — it was a multi-day grid crisis. Without grid power, a heat pump doesn''t run — just like a gas furnace (which needs electricity for the blower, gas valve, and controls). The grid failure was the problem, not the heating source.

**The honest answer:** During a Uri-scale event, no single heating source is guaranteed. A dual-fuel system gives you two fuel sources — electricity and gas — rather than depending entirely on one. That''s the most resilient residential configuration available.

## The Inverter Difference in Cold Weather

**Old single-stage heat pump at 30°F:** Runs at 100%, struggles, cycles, relies heavily on auxiliary electric heat strips (COP 1.0). This gave heat pumps a bad reputation in Texas.

**Modern inverter heat pump at 30°F:** Runs at 70–85% with the compressor modulating to match the load. No cycling, no auxiliary heat. COP of 2.0–2.5. The home stays warm.

The technology has changed. The reputation hasn''t caught up.

## Model-Specific Cold Weather Performance

| System | Minimum Operating Temp | HSPF2 (3-ton) | Dallas Winter Coverage |
|---|---|---|---|
| **Goodman GZV6S3610A** | ~0°F | ~8.5 | 85–90% of heating days |
| **Trane 5TWV0X36A1000** | ~-10°F | ~10.0–10.5 | 90–95% of heating days |
| **Bosch IDS Premium** | Varies | Varies | 85–90% of heating days |
| **Mitsubishi Hyper-Heat** | -22°F | Varies | 95%+ of heating days |

## The Environmental Case

For a Dallas home burning 500 therms per winter:
- **Gas heating:** 500 × 11.7 lbs CO₂/therm = **5,850 lbs CO₂ per winter**
- **Dual-fuel (85% electric):** ~1,800–2,400 lbs total CO₂
- **Reduction: 3,400–4,000 lbs CO₂ per winter** — a 60–70% reduction.

ERCOT is adding wind and solar capacity rapidly. A heat pump installed today produces fewer emissions per heating season with each passing year, automatically.

## The Bottom Line for Dallas

A heat pump works in a Texas winter. A modern inverter heat pump works well. And in Dallas''s specific climate — where 85–95% of heating days are above 35°F — a heat pump is not just viable, it''s the more efficient, more economical, and cleaner choice for the vast majority of the heating season.

The freeze question is a grid reliability question, not a heat pump technology question. Dual-fuel solves it by keeping both fuel sources available.

## Related Pages

- [Best Dual-Fuel Heat Pump Dallas →](/best-dual-fuel-heat-pump-dallas/)
- [Trane 5TWV0X Heat Pump →](/trane-5twv0x-heat-pump-dallas/)
- [Bosch Dual-Fuel Heat Pump →](/bosch-dual-fuel-heat-pump-dallas/)
- [Heat Pump vs Gas Furnace — Dallas Comparison →](/heat-pump-vs-gas-furnace-dallas-oak-cliff/)

## Ready to Switch to a Heat Pump?

Truficient installs inverter heat pumps in dual-fuel and all-electric configurations throughout Dallas.

**Call [214-238-4349](tel:2142384349)** or **[request a quote online](#contact).**
$CONTENT$,
  '{"@context":"https://schema.org","@type":"HVACBusiness","name":"Truficient Energy Solutions","url":"https://truficient.com","telephone":"214-238-4349","address":{"@type":"PostalAddress","addressLocality":"Dallas","addressRegion":"TX","postalCode":"75208","addressCountry":"US"},"areaServed":{"@type":"City","name":"Dallas"},"description":"Engineering analysis of inverter heat pump performance in Dallas winter conditions.","priceRange":"$$"}'::jsonb,
  true, true
);

-- =============================================================================
-- Sync new pages to page_seo registry for SEO dashboard tracking
-- =============================================================================
INSERT INTO page_seo (page_path, page_name, meta_title, meta_description, page_type, schema_applied, index_status, cluster, target_keyword)
SELECT 
  slp.url_slug,
  slp.neighborhood,
  slp.meta_title,
  slp.meta_description,
  CASE 
    WHEN slp.page_type = 'Brand Pillar' THEN 'Brand Pillar'
    WHEN slp.page_type = 'Brand Spoke' THEN 'Brand Pillar'
    WHEN slp.page_type = 'Project Showcase' THEN 'location'
    WHEN slp.page_type = 'Educational' THEN 'Brand Pillar'
    ELSE 'location'
  END,
  true,
  'Pending',
  slp.cluster,
  slp.h1_title
FROM seo_location_pages slp
LEFT JOIN page_seo ps ON ps.page_path = slp.url_slug
WHERE ps.id IS NULL
  AND slp.url_slug IN (
    '/trane-trucomfort-variable-speed-dallas/',
    '/trane-trucomfort-highland-park-dallas/',
    '/trane-5twv0x-heat-pump-dallas/',
    '/project/trane-highland-park-trucomfort-upgrade/',
    '/project/goodman-oak-cliff-bungalow-r22-upgrade/',
    '/project/bosch-oak-cliff-dual-fuel-install/',
    '/heat-pump-texas-winter-freeze-performance/'
  );

-- Link seo_location_pages to their page_seo records
UPDATE seo_location_pages slp
SET page_seo_id = ps.id
FROM page_seo ps
WHERE ps.page_path = slp.url_slug
  AND slp.page_seo_id IS NULL
  AND slp.url_slug IN (
    '/trane-trucomfort-variable-speed-dallas/',
    '/trane-trucomfort-highland-park-dallas/',
    '/trane-5twv0x-heat-pump-dallas/',
    '/project/trane-highland-park-trucomfort-upgrade/',
    '/project/goodman-oak-cliff-bungalow-r22-upgrade/',
    '/project/bosch-oak-cliff-dual-fuel-install/',
    '/heat-pump-texas-winter-freeze-performance/'
  );