// Import dependencies
import { Router } from 'express';

// Initialize router
const router = Router();

// GitHub OAuth endpoint
router.get('/auth/github/url', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'GitHub Client ID not configured' });
    }
    
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/github/callback`;
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'repo',
        response_type: 'code'
    });
    
    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
});

// GitHub OAuth callback
router.get('/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${appUrl}/api/auth/github/callback`;
    
    if (!code || !clientId || !clientSecret) {
        return res.status(400).send('Missing code or configuration');
    }

    try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri
            })
        });

        const tokenData: any = await tokenRes.json();
        const token = tokenData.access_token;

        if (!token) {
            throw new Error('Failed to obtain access token');
        }

        res.send(`
            <html>
                <body>
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${token}' }, '*');
                            window.close();
                        } else {
                            window.location.href = '/';
                        }
                    </script>
                    <p>Authentication successful. This window should close automatically.</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('GitHub Auth Error:', error);
        res.status(500).send('Authentication failed');
    }
});

// Publish endpoint
router.post('/publish', async (req, res) => {
    const { token, repoName, description } = req.body;
    
    if (!token || !repoName) {
        return res.status(400).json({ error: 'Missing token or repository name' });
    }

    try {
        // Create repository
        const createRepoRes = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: repoName,
                description: description || 'Created with Open-Code',
                auto_init: true
            })
        });

        if (!createRepoRes.ok) {
            const errorData: any = await createRepoRes.json();
            throw new Error(errorData.message || 'Failed to create repository');
        }

        const repoData: any = await createRepoRes.json();
        res.json({ success: true, url: repoData.html_url });
    } catch (error) {
        console.error('Publish Error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to publish' });
    }
});

// Code execution endpoint (Proxy to Paiza.io to avoid CORS)
router.post('/execute', async (req, res) => {
    const { code, language } = req.body;
    console.log(`[EXECUTE] Language: ${language}, Code length: ${code?.length}`);

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        // Step 1: Create submission
        console.log('[EXECUTE] Creating submission...');
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
            throw new Error(`Execution Engine Error (${createRes.status}): ${errorText}`);
        }

        const createData: any = await createRes.json();
        const id = createData.id;

        if (!id) {
            return res.status(500).json({ error: 'Failed to create execution task.' });
        }

        // Step 2: Poll for completion
        let status = 'running';
        let attempts = 0;
        const maxAttempts = 15; // Reduced to fit within serverless limits
        const pollInterval = 1000; // Increased interval for efficiency

        while (status === 'running' && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
            const statusRes = await fetch(`https://api.paiza.io/runners/get_status?id=${id}&api_key=guest`);
            
            if (!statusRes.ok) {
                const errorText = await statusRes.text();
                throw new Error(`Execution Status Error (${statusRes.status}): ${errorText}`);
            }

            const statusData: any = await statusRes.json();
            status = statusData.status;
        }

        if (status === 'running') {
            return res.status(504).json({ error: 'Execution timed out. The code might be taking too long to run.' });
        }

        // Step 3: Get details
        const detailsRes = await fetch(`https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`);
        
        if (!detailsRes.ok) {
            const errorText = await detailsRes.text();
            throw new Error(`Execution Details Error (${detailsRes.status}): ${errorText}`);
        }

        const details: any = await detailsRes.json();
        
        res.json(details);
    } catch (error) {
        console.error('Proxy Execution Error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
    }
});

export default router;