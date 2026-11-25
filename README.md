# Horse Movement Management

A web application for tracking and managing horse training activities, workload intensity, and recovery periods.

## Features

- **Monthly Calendar View** - Track daily activities with visual indicators for workout intensity
- **Activity Types**:
  - Light ground work (Práce ze země / lehká)
  - Jumping practice (Skokovka)
  - Competitions (Závody)
  - Recovery days (Regenerace)
  - Laser therapy (Laser)
- **Intensity Levels**: Regenerace, Lehká, Střední, Vysoká
- **Monthly Statistics** - Overview of activity distribution and workload balance
- **Alerts & Insights** - Warnings about consecutive high-intensity days, lack of recovery, etc.
- **Year Overview** - Visual representation of the entire year's workload distribution
- **Excel Import/Export** - Import existing data from spreadsheets and export as CSV
- **Dark Mode Support** - Automatic theme switching based on system preferences
- **Local Storage** - Data persists in browser localStorage (with optional Claude integration)

## Usage

Simply open `index.html` in a web browser. The app works completely offline and stores data locally in your browser.

### Importing Data

1. Click "Import z Excelu a export" at the bottom
2. Upload your Excel file (expects columns: Datum, Typ práce, Zátěž)
3. Data will be automatically parsed and added to the calendar

### Exporting Data

Click "Kopírovat všechna data jako CSV" to copy all entries to clipboard in CSV format.

## Horse Info

Currently configured for:
- Horse born: April 2, 2007
- Records starting: February 2026

To customize, edit the `BIRTH` constant in the JavaScript section and the metadata text.

## Technical Details

- Pure HTML/CSS/JavaScript - no build process required
- Uses [Fraunces](https://fonts.google.com/specimen/Fraunces) and [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) fonts
- Excel parsing via [SheetJS](https://sheetjs.com/)
- Responsive design for mobile and desktop
- Accessible with ARIA labels and keyboard navigation

## License

Personal project - use as you wish.
