const express = require('express');
const axios = require('axios');

const router = express.Router();

const COCO_PREVIEW_URL =
    process.env.COCO_ATTENDANCE_PREVIEW_URL ||
    'https://coco-eight-vert.vercel.app/api/attendance/preview';

router.get('/preview', async (req, res) => {
    try {
        const username = process.env.COCO_ADMIN_USERNAME;
        const password = process.env.COCO_ADMIN_PASSWORD;

        if (!username || !password) {
            return res.status(500).json({
                success: false,
                error: 'COCO admin credentials are not configured.'
            });
        }

        const loginUrl = new URL('/api/auth/login', COCO_PREVIEW_URL).toString();

        const login = await axios.post(
            loginUrl,
            { username, password },
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000
            }
        );

        const cookies = login.headers['set-cookie'] || [];
        const sessionCookie = cookies
            .map(cookie => cookie.split(';')[0])
            .find(cookie => cookie.startsWith('coco_admin_session='));

        if (!login.data?.success || !sessionCookie) {
            return res.status(502).json({
                success: false,
                error: 'COCO login did not return a valid session.'
            });
        }

        const upstream = await axios.get(COCO_PREVIEW_URL, {
            headers: {
                Accept: 'application/json',
                Cookie: sessionCookie
            },
            timeout: 15000
        });


        if (
            !upstream.data ||
            typeof upstream.data !== 'object' ||
            !Array.isArray(upstream.data.records)
        ) {
            return res.status(502).json({
                success: false,
                error: 'COCO attendance service returned an unexpected response.'
            });
        }

        return res.status(200).json(upstream.data);
    } catch (error) {
        if (error.response?.status === 404) {
            return res.status(200).json({
                success: true,
                count: 0,
                updatedAt: null,
                records: []
            });
        }

        const timedOut = error.code === 'ECONNABORTED';

        console.error(
            'COCO attendance preview request failed:',
            error.response?.status || error.code || error.message
        );

        return res.status(timedOut ? 504 : 502).json({
            success: false,
            error: timedOut
                ? 'COCO attendance service timed out. Please try again.'
                : error.response?.status
                    ? `COCO attendance service returned HTTP ${error.response.status}.`
                    : 'COCO attendance service is temporarily unavailable.'
        });
    }
});

module.exports = { route: router };
