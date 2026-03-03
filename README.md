# Poultry Management System

A comprehensive web application for managing poultry farms, built with React, Vite, Supabase, and modern web technologies.

## Features

- **Dashboard**: Real-time overview of your farm with beautiful charts and statistics
- **Flock Management**: Track bird batches, quantities, and statuses
- **Egg Tracking**: Record daily egg production and broken eggs
- **Sales & Accounting**: Manage income and expenses with category breakdowns
- **Reporting**: Comprehensive analytics with production trends and financial reports

## Tech Stack

- **Frontend**: React 19, React Router, Vite
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (PostgreSQL database)
- **Styling**: Vanilla CSS with custom design system
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Vitest, React Testing Library

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## Setup Instructions

### 1. Environment Configuration

Copy the environment example file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup

Run the SQL schema in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Open the file `supabase/migrations/0001_initial_schema.sql`
4. Run the SQL to create the required tables

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Run Tests

```bash
npm test
```

## Project Structure

```
poultry-app/
├── src/
│   ├── components/        # Reusable components
│   │   └── Layout.jsx     # Main layout with navigation
│   ├── views/             # Page components
│   │   ├── Dashboard.jsx
│   │   ├── FlockManagement.jsx
│   │   ├── EggTracking.jsx
│   │   ├── SalesAccounting.jsx
│   │   └── Reporting.jsx
│   ├── supabase/          # Supabase configuration
│   │   └── supabase.js
│   ├── utils/             # Utility functions
│   │   ├── formatting.js
│   │   ├── financialCalculations.js
│   │   └── *.test.js      # Unit tests
│   ├── test/              # Test setup
│   │   └── setup.js
│   ├── index.css          # Global styles
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── supabase/
│   └── migrations/        # Database migrations
│       └── 0001_initial_schema.sql
├── .env.example           # Environment template
├── package.json
├── vite.config.js
└── index.html
```

## Database Schema

### Tables

- **flocks**: Track bird batches (type, quantity, date_added, status)
- **daily_records**: Daily egg collection records
- **sales**: Sales transactions for birds and eggs
- **finances**: Income and expense tracking

## Design System

The app features a premium dark theme with:
- Glassmorphism effects
- Gradient accents (primary: indigo-purple, secondary: green, accent: amber)
- Inter and Outfit fonts from Google Fonts
- Responsive design (mobile: 375px, tablet: 768px, desktop: 1024px+)
- CSS Grid and Flexbox layouts
- Smooth animations and transitions

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Deployment

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Deploy to Netlify

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to Netlify
3. Set environment variables in Netlify dashboard

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for poultry farmers worldwide