// Server/middleware/auth.js

// Validate API Key middleware
const validateApiKey = (req, res, next) => {
    console.log('🔑 Validating API key in request:', req.body);
    const apiKey = req.body.apiKey || req.query.api_key;
    
    if (!apiKey) {
        console.log('❌ No API key found in request');
        return res.status(401).json({ 
            success: false, 
            message: 'Missing API key' 
        });
    }
    
    if (apiKey !== process.env.API_KEY) {
        console.log(`❌ Invalid API key: ${apiKey}, expected: ${process.env.API_KEY}`);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid API key' 
        });
    }
    
    console.log('✓ API key validated successfully');
    next();
};

module.exports = {
    validateApiKey
};