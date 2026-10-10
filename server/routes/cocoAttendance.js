const express = require('express');
const axios = require('axios');

const router = express.Router();
const COCO_PREVIEW_URL = process.env.COCO_ATTENDANCE_PREVIEW_URL ||
    'https://coco-eight-vert.vercel.app/api/attendance/preview';

router.get('/preview', async (req, res) => {
    try {
        const upstream = await axios.get(COCO_PREVIEW_URL, {
            headers: { Accept: 'application/json' },
            timeout: 15000
        });

        if (!upstream.data || typeof upstream.data !== 'object' || !Array.isArray(upstream.data.records)) {
            return res.status(502).json({
                success: false,
                error: 'COCO attendance service returned an unexpected response.'
            });
        }

        return res.status(200).json(upstream.data);
    } catch (error) {
        const timedOut = error.code === 'ECONNABORTED';
        console.error('COCO attendance preview request failed:', error.message);

        return res.status(timedOut ? 504 : 502).json({
            success: false,
            error: timedOut
                ? 'COCO attendance service timed out. Please try again.'
                : 'COCO attendance service is temporarily unavailable.'
        });
    }
});

module.exports = { route: router };
