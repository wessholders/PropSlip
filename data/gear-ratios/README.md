# Gear Ratio Reference Data

This directory stores researched outboard lower-unit gear-ratio data as static JSON files. The data is intended to be easy to review, version-control, validate, and eventually consume from the app.

Do not guess, calculate, normalize, merge, or silently modify researched data. Source files supplied by research are authoritative inputs.

## Directory Organization

Each manufacturer has its own directory:

```text
data/gear-ratios/
  schemas/
  yamaha/
  mercury/
  honda/
  suzuki/
  tohatsu/
  nissan/
  evinrude/
  johnson/
  mariner/
  force/
```

Manufacturer directories may use different internal formats over time. Yamaha starts with one JSON file per model year, but another manufacturer may later need a serial-number-based format and its own schema.

## Yamaha Year Files

Yamaha year files belong at:

```text
data/gear-ratios/yamaha/[YEAR].json
```

For example, researched 2005 Yamaha data should be placed at:

```text
data/gear-ratios/yamaha/2005.json
```

Yamaha files use this hierarchy:

```text
Manufacturer -> Year -> Horsepower -> Exact Yamaha Model Code -> Gear Ratio(s)
```

Shape:

```json
{
  "manufacturer": "Yamaha",
  "year": 2005,
  "horsepower": {
    "70": {
      "70TLR": {
        "gear_ratios": [
          {
            "ratio": "2.33:1",
            "source_url": "https://example.com/source"
          }
        ],
        "diagram_url": "https://example.com/parts-diagram"
      }
    }
  }
}
```

## Field Rules

- `manufacturer`: required. Yamaha files must use `"Yamaha"`.
- `year`: required integer. It must match the filename, such as `2005.json`.
- `horsepower`: required object. Horsepower values are object keys and must stay strings, including decimal ratings like `"9.9"`.
- Model code keys: exact manufacturer model designations. Preserve spelling, punctuation, and suffixes. Do not combine models just because they share a ratio.
- `gear_ratios`: required array. It may be empty when a model is known but its ratio is unresolved.
- `ratio`: required for every populated gear-ratio entry. Canonical display format is like `2.33:1`.
- `source_url`: optional URL for the source that supports that specific ratio.
- `diagram_url`: optional URL associated with the model, usually a lower-unit, lower-casing, drive, or gearcase diagram.

`source_url` proves or supports a ratio. `diagram_url` points to a relevant parts diagram for the model and does not necessarily prove the ratio.

Multiple documented ratios remain separate entries:

```json
"gear_ratios": [
  {
    "ratio": "2.00:1",
    "source_url": "https://example.com/source-a"
  },
  {
    "ratio": "2.33:1",
    "source_url": "https://example.com/source-b"
  }
]
```

## Validation

Run:

```text
node scripts/validate-gear-ratios.js
```

The validator recursively checks researched JSON files, applies the manufacturer-specific schema when one exists, verifies Yamaha filename/year agreement, and exits non-zero when invalid data is found.
