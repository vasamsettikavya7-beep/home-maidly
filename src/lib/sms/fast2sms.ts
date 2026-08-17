// Fast2SMS Utility for sending transaction notification SMS in India
export async function sendSmsNotification(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey === 'YOUR_FAST2SMS_API_KEY') {
    console.log(`\n--- [Fast2SMS Mock Log] ---\nTo: ${phone}\nMessage: "${message}"\n---------------------------\n`);
    return true;
  }

  // Normalize phone number to 10 digits (Fast2SMS expects a comma-separated string of 10-digit numbers)
  const normalizedPhone = phone.replace(/[^0-9]/g, '').slice(-10);

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        numbers: normalizedPhone
      })
    });

    const data = await response.json();
    if (data.return) {
      console.log(`[Fast2SMS Success] SMS sent to ${normalizedPhone}. RequestId: ${data.request_id}`);
      return true;
    } else {
      console.error(`[Fast2SMS Failure] API Response error:`, data);
      return false;
    }
  } catch (error) {
    console.error(`[Fast2SMS Error] Connection failed:`, error);
    return false;
  }
}
