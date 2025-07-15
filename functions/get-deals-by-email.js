const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { email } = event.queryStringParameters;
  const API_KEY = process.env.HUBSPOT_API_KEY;

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing email parameter' }),
    };
  }

  try {
    // Step 1: Get contact by email
    const contactRes = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        properties: ['email'],
      }),
    });

    const contactData = await contactRes.json();
    const contactId = contactData.results?.[0]?.id;

    if (!con

