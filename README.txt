# Ad Management Dashboard

This workspace contains a React application styled with Tailwind CSS that provides an ad management dashboard.

## Features

- Fixed budget header showing a hard-coded total account balance ($5,000) and remaining daily capacity.
- Ad inventory table with columns: Ad Name, Status (Active/Paused toggle), Daily Budget Limit, Type (image/video), Actions (Edit/Delete).
- CRUD operations for ads with validation (prevent adding ads exceeding remaining capacity).
- Daily Limit highlighted in red if set to $0.
- Dark mode aesthetic inspired by Google Ads / Stripe.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run the development server**
   ```bash
   npm start
   ```

3. **Building for production**
   ```bash
   npm run build
   ```

## Tailwind CSS Setup

Tailwind is already configured via `tailwind.config.js` and `postcss.config.js`. The `src/index.css` file includes the necessary directives.

## Notes

- A Go backend runs on `localhost:8080` with full CRUD, scheduling, and geofencing. The React frontend calls its APIs using `src/api.js`. Ensure the backend is started before using the app.

- The app automatically calls the backend tracking endpoints when ads are displayed or clicked. Impression events are sent as rows render; click events fire when you click an ad name. Video ads cost $2/click and image ads cost $1/click; the frontend form allows you to choose the type and supply a destination URL.
- Click an ad name in the inventory to open a metrics page showing Impressions, Clicks, CTR, CPC, total spend, and remaining ad balance.

- To customize the account balance, modify the `balance` variable in `src/App.js`.


