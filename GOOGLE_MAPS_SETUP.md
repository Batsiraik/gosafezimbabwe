# Google Maps API Setup Guide for NexRyde

## Required APIs to Enable

Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Library

Enable these APIs:

### 1. **Maps JavaScript API** ✅ REQUIRED
   - Used for displaying the map
   - Enable: `Maps JavaScript API`

### 2. **Places API (New)** ✅ REQUIRED
   - Used for destination autocomplete
   - Enable: `Places API (New)`
   - NOT the old "Places API" - make sure it's the NEW one

### 3. **Routes API** ✅ REQUIRED (Recommended)
   - Used for calculating routes and distances
   - Enable: `Routes API`
   - This is the NEW API that replaces the legacy Directions API

### 4. **Directions API** (Legacy - Optional)
   - Only if you want to use the old API
   - Enable: `Directions API`
   - Note: This is deprecated, Routes API is recommended

### 5. **Geocoding API** (Optional)
   - For reverse geocoding if needed
   - Enable: `Geocoding API`

## API Key Setup

1. Go to APIs & Services → Credentials
2. Create API Key or use existing one
3. Add your API key to `.env.local`:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

## API Restrictions (Recommended)

For security, restrict your API key:
1. Go to your API key settings
2. Under "Application restrictions":
   - Choose "HTTP referrers (web sites)"
   - Add: `localhost:3000/*` (for development)
   - Add: `yourdomain.com/*` (for production)
3. Under "API restrictions":
   - Restrict to only the APIs listed above

## Testing

The app will work with:
- ✅ Maps JavaScript API (for map display)
- ✅ Places API (New) (for autocomplete)
- ✅ Routes API (for route calculation) OR Directions API (legacy)

If Routes API is not enabled, the app will fall back to calculating straight-line distance.

## Browser Compatibility

Opera browser should work fine! The issue is likely API permissions, not browser compatibility.

