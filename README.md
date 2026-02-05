# Property Tax Assessment Visualizer

A high-performance React application for visualizing and analyzing property tax assessment data.

## Features

- **Interactive Dashboard**: View key statistics like Average Assessment Change and Fairness metrics.
- **Deep Filtering**: Filter by Neighborhood, Street, and Building Type with cascading dropdowns.
- **Fairness Analysis**: Automatically highlights properties with assessment increases significantly above the neighborhood average.
- **Internationalization**: Full support for English and Chinese (Simplified).
- **High Performance**: Uses an in-browser SQLite database (`sql.js`) to handle 200,000+ records instantly without a backend server.

## Setup Instructions

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Installation

```bash
cd APP
npm install
```

### 3. Data Preparation
The application relies on a generated SQLite database.

1.  Place your source data file named `Assessment_Parcels.csv` into the `APP/` directory.
    *   *Note: This file is ignored by git due to size.*
2.  Run the conversion script:
    ```bash
    node scripts/convert-csv-to-sqlite.js
    ```
    This will generate `public/properties.db`.

### 4. Development
Start the local development server:

```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment

### Generate Build
To create a production-ready build:

```bash
npm run build
```
The output will be in the `APP/dist` folder.

### Deploying to GitHub Pages
1.  Push this repository to GitHub.
2.  Go to Settings -> Pages.
3.  Select "GitHub Actions" as the source.
4.  Use the "Static HTML" workflow to deploy the `APP/dist` folder.

### Deploying to Cloudflare Pages (Recommended)
1.  Connect your GitHub repository to Cloudflare Pages.
2.  **Build Settings**:
    *   **Framework**: Vite / React
    *   **Build command**: `npm run build`
    *   **Build output directory**: `dist`
    *   **Root directory**: `APP`
3.  Click "Deploy".

## Important Notes on Data
*   **Git Ignore**: The `*.csv` and `*.db` files are ignored to keep the repository light. You must recreate the DB locally or during your build process if possible (though generating a 40MB DB during a CI build might be slow; consider committing the `.db` if using LFS, but standard git handles <100MB okay if you choose to un-ignore it). 
*   **Current Config**: By default, `properties.db` is ignored.
