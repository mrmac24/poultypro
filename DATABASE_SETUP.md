# Database Setup Guide

## Quick Setup Checklist

### 1. ✅ Environment Variables (DONE)
Your `.env` file is configured with Supabase credentials.

### 2. ⚠️ Create Database Tables (REQUIRED)

**This is likely why saves aren't working!**

You need to create the tables in your Supabase project:

1. Go to https://app.supabase.com
2. Select your project: `epeybvlhoawmxcxswmmb`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `supabase/migrations/0001_initial_schema.sql`
6. Click **Run** to execute the SQL

The SQL will create these tables:
- `flocks` - Store bird batch information
- `daily_records` - Store daily egg collection data
- `sales` - Store sales transactions
- `finances` - Store income and expenses

### 3. ⚠️ Disable Row Level Security (RLS) - IMPORTANT

By default, Supabase enables Row Level Security which blocks all writes. You need to disable it:

1. In Supabase dashboard, go to **Table Editor**
2. For each table (flocks, daily_records, finances, sales):
   - Click on the table name
   - Click on **Authentication** (lock icon in top right)
   - Turn OFF **Enable RLS** toggle
   - Click **Save**

### 4. Test the Connection

After completing steps 2 and 3:

1. Open your browser console (F12 > Console)
2. Refresh the page
3. Look for: `✓ Supabase connection successful`
4. Try saving a record - it should work now!

## Troubleshooting

### "Error saving transaction" or similar errors

**Problem**: Tables don't exist in Supabase
**Solution**: Run the SQL migration (Step 2 above)

### "new row violates row-level security policy"

**Problem**: RLS is blocking writes
**Solution**: Disable RLS for all tables (Step 3 above)

### "Failed to fetch" or network errors

**Problem**: Wrong Supabase URL or key
**Solution**: 
- Check your `.env` file
- Verify URL format: `https://your-project.supabase.co`
- Make sure you're using the **anon** key (not service_role)

### Console shows "Supabase credentials not configured"

**Problem**: Environment variables not loaded
**Solution**: 
- Restart the dev server: `npm run dev`
- Make sure `.env` is in the project root (poultry-app folder)

## Verify Everything is Working

After setup, you should see in browser console:
```
Supabase URL configured: Yes
Supabase Key configured: Yes
✓ Supabase connection successful
```

When you save a record, you should see:
```
Creating transaction: {...}
Transaction created: [{...}]
```

## Need Help?

If you're still having issues:

1. Check browser console for specific error messages
2. Check Supabase logs (Dashboard > Logs > Database)
3. Make sure you've run the SQL migration
4. Ensure RLS is disabled for all tables

## Security Note

⚠️ **For Production**: Disabling RLS is not recommended. You should:
- Enable RLS
- Create proper policies for authenticated users
- Set up authentication if needed

For this demo/development, disabling RLS is acceptable.