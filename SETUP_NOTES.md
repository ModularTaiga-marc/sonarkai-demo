# Setup Notes for SonarKai Demo

## Files Prepared

All frontend files have been copied and mockup data created. However, the JavaScript files need minor modifications to work in mockup mode.

## Required Modifications

### 1. app-interactive-navigation.js

Add at the very beginning (line 1):

```javascript
// MOCKUP MODE FLAG - Demo runs client-side with no backend
const MOCKUP_MODE = true;
```

Then find all `fetch()` calls and wrap them with mockup interceptor. Example pattern:

**BEFORE:**
```javascript
const response = await fetch(`${API_BASE}/api/node/company-root?company=${company}`);
const data = await response.json();
```

**AFTER:**
```javascript
const response = MOCKUP_MODE
    ? { ok: true, json: async () => await mockApiCall('/api/node/company-root', { company }) }
    : await fetch(`${API_BASE}/api/node/company-root?company=${company}`);
const data = await response.json();
```

There are approximately 5-7 fetch calls to modify.

### 2. app-semantic-catalyst.js

Add at the beginning:

```javascript
// MOCKUP MODE FLAG
const MOCKUP_MODE = true;
```

Find the token tracking section and disable it in mockup mode:

```javascript
if (!MOCKUP_MODE) {
    // Token tracking code here
}
```

## Alternative: Use Original Files As-Is

The mockup-data-loader.js is already set up to intercept API calls. You can:

1. **Option A:** Modify the JS files as described above (recommended)
2. **Option B:** Keep files as-is and let mockup-data-loader intercept (may show errors in console but will work)

## Testing Locally

```bash
cd /tmp/sonarkai-demo-prep
python3 -m http.server 8000
# Open http://localhost:8000/generate/
```

Try entering "Acme Insurance" or "Global Bank" as company name.

## Next Steps

1. Test the demo locally
2. Fix any JavaScript errors
3. Commit to GitHub
4. Update LinkedIn announcement

## Files Ready to Push

- ✅ index.html (landing page)
- ✅ generate/index.html (wizard + graph)
- ✅ js/app-semantic-catalyst.js (needs MOCKUP_MODE flag)
- ✅ js/app-interactive-navigation.js (needs MOCKUP_MODE flag + fetch wrappers)
- ✅ js/mockup-data-loader.js (ready)
- ✅ mockup-data/*.json (4 files, ready)
- ✅ README.md (comprehensive)
- ✅ .gitignore (ready)
- ✅ assets/favicon.svg (ready)
