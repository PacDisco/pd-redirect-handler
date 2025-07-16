const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { email } = event.queryStringParameters;
  const API_KEY = process.env.HUBSPOT_API_KEY;

  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': 'https://www.pacificdiscovery.org',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!email) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing email parameter' }),
    };
  }

  try {
    // Get contact by email
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

    if (!contactId) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No contact found with this email' }),
      };
    }

    // Get deals associated with the contact
    const dealsRes = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'associatedcontactid',
            operator: 'EQ',
            value: contactId
          }]
        }],
        properties: ['dealname', 'pd_program', 'program_status'],
      }),
    });

    const dealsData = await dealsRes.json();
    const results = dealsData.results?.map(deal => ({
      dealId: deal.id,
      dealName: deal.properties.dealname,
      pdProgram: deal.properties.pd_program,
      programStatus: deal.properties.program_status
    })) || [];

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(results)
    };

  } catch (err) {
    console.error("Error fetching HubSpot data:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
