const escapeXml = (value) => String(value).replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);

async function twilioRequest(resource, fields) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${resource}.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, ...fields }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  return response.json();
}

export async function deliverEmergencyAlert(alert) {
  const mode = (process.env.ALERT_DELIVERY ?? 'off').toLowerCase();
  const channels = mode.split(',').map((item) => item.trim()).filter((item) => item === 'sms' || item === 'call');
  if (!channels.length) return { status: 'not_configured', message: 'Contact delivery is turned off.' };
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    return { status: 'not_configured', message: 'SMS/call provider credentials are not configured.' };
  }
  const recipients = (alert.emergencyContacts ?? []).filter((contact) => contact.alertEnabled);
  if (!recipients.length) return { status: 'no_contacts', message: 'No contacts have opted in to emergency delivery.' };

  const { latitude, longitude } = alert.location;
  const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
  const body = `SafeGaurd emergency alert: ${alert.detectedEvent}. Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)} (${mapLink}). Please contact the user now.`;
  const twiml = `<Response><Say>A SafeGaurd emergency alert was confirmed. The detected event is ${escapeXml(alert.detectedEvent)}. The location is latitude ${latitude.toFixed(5)}, longitude ${longitude.toFixed(5)}. Please contact the user.</Say></Response>`;
  const jobs = recipients.flatMap((contact) => channels.map(async (channel) => {
    const e164 = contact.phone.replace(/[\s()-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
      return { contactName: contact.name, phone: contact.phone, channel, status: 'failed' };
    }
    try {
      const result = channel === 'sms'
        ? await twilioRequest('Messages', { To: e164, Body: body })
        : await twilioRequest('Calls', { To: e164, Twiml: twiml });
      return { contactName: contact.name, phone: contact.phone, channel, status: 'queued', providerId: result.sid };
    } catch (error) {
      console.error(`Emergency ${channel} delivery failed for contact ${contact.id}:`, error.message);
      return { contactName: contact.name, phone: contact.phone, channel, status: 'failed' };
    }
  }));
  const results = await Promise.all(jobs);
  const sent = results.filter((result) => result.status === 'queued').length;
  return {
    status: sent === results.length ? 'queued' : sent ? 'partial' : 'failed',
    message: `${sent} of ${results.length} notifications accepted by the provider.`,
    results,
  };
}
