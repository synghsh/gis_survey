# Design Token System (Glassmorphic Cyber-Grid HUD)

This document lists the visual design tokens, color hex values, and component styles used to style the Electrical HT/LT Surveying App.

---

## 1. Color Palette

| Token | Hex/RGBA | Usage |
|---|---|---|
| **Background Base** | `#080B11` | Deep space-black base canvas |
| **Glass Surface** | `rgba(17, 24, 39, 0.70)` | Main cards, panels, list items |
| **Glass Border** | `rgba(6, 182, 212, 0.15)` | Thin glowing cyan frame for panels |
| **Text Primary** | `#F3F4F6` | Labels, headers, values |
| **Text Secondary** | `#9CA3AF` | Captions, sequence indices, subtext |
| **Neon Amber (11KV)** | `#F59E0B` | HT 11KV Cable status, accents, warnings |
| **Neon Red (33KV)** | `#EF4444` | HT 33KV Cable status, errors, critical nodes |
| **Neon Cyan (LT 440V)** | `#06B6D4` | LT Cable status, successful syncs, active GPS |
| **Neon Purple (DTR)** | `#8B5CF6` | Distribution Transformer (DTR) nodes |
| **Glow Shadow** | `rgba(6, 182, 212, 0.4)` | Outer glows for key active buttons |

---

## 2. Typography Rules

*   **Font Family**: System Default Sans-Serif (`Inter`, `System` inside React Native)
*   **Header Titles**: Size `22sp`, Semi-Bold, Letter Spacing `0.5px`, Upper Case where appropriate.
*   **Section Headers**: Size `16sp`, Medium, Cyan Text.
*   **Body Text**: Size `14sp`, Regular, Grey-White.
*   **Monospace/Data**: Size `13sp`, Monospace (for GPS Coordinates and Sequence numbers).

---

## 3. Glassmorphic HUD Elements

### Panel Backdrop
*   `backgroundColor`: `rgba(17, 24, 39, 0.75)`
*   `borderColor`: `rgba(6, 182, 212, 0.2)`
*   `borderWidth`: `1px`
*   `borderRadius`: `12px`
*   `padding`: `16px`

### HUD Cyber-Grid Overlay
A light background grid created using repeating borders or overlay grids:
*   Grid spacing: `24px`
*   Grid Line: `rgba(6, 182, 212, 0.03)`

### Cyber Glowing Button
*   `backgroundColor`: `rgba(6, 182, 212, 0.12)`
*   `borderColor`: `#06B6D4`
*   `borderWidth`: `1.5px`
*   `borderRadius`: `8px`
*   `shadowColor`: `#06B6D4`
*   `shadowOpacity`: `0.5`
*   `shadowRadius`: `6px`
*   `shadowOffset`: `{ width: 0, height: 0 }`
