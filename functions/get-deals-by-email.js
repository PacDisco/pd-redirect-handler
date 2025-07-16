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
    // Step 1: Find the contact by email
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
    console.log("Contact search response:", JSON.stringify(contactData, null, 2));
    
    const contactId = contactData.results?.[0]?.id;

    if (!contactId) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'No contact found with this email' }),
      };
    }

    // Step 2: Get deals associated with this contact
    const assocRes = await fetch(`https://api.hubapi.com/crm/v4/objects/contacts/${contactId}/associations/deal`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const assocData = await assocRes.json();
    console.log("Association response:", JSON.stringify(assocData, null, 2));

    // Correctly extract deal IDs
    const dealIds = (assocData.results || [])
      .map(a => a.toObjectId)
      .filter(id => !!id); // filter out undefined or null

    if (dealIds.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      };
    }

    // Step 3: Fetch deal details in parallel
    const dealPromises = dealIds.map(id =>
      fetch(`https://api.hubapi.com/crm/v3/objects/deals/${id}?properties=dealname,pd_program,program_status`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        }
      }).then(res => res.json())
    );

    const dealResponses = await Promise.all(dealPromises);
    console.log("Deal responses:", JSON.stringify(dealResponses, null, 2));

    // Extract and format the deal data
    const deals = dealResponses.map(d => ({
      dealId: d.id,
      dealName: d.properties?.dealname || 'Unnamed Deal',
      pdProgram: d.properties?.pd_program || '',
      programStatus: d.properties?.program_status || '',
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(deals),
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
