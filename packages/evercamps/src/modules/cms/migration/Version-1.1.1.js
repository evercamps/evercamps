import { execute } from '@evershop/postgres-query-builder';

export default async (connection) => {
  // Drop the layout column in the cms_page table
  await execute(connection, `ALTER TABLE cms_page DROP COLUMN layout`);

  const query = `
    INSERT INTO widget (name, type, route, area, sort_order, settings, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  const mainMenu = [
    'Main menu',
    'basic_menu',
    '["all"]',
    '["header"]',
    1,
    JSON.stringify({
      menus: [
        {
          id: 'hanhk3km0m8nt2b',

          url: 'javascript:void(0)',
          name: 'Shop ❤️',
          type: 'custom',

          uuid: 'javascript:void(0)',
          children: [
            {
              id: 'hanhk3km0m8nt2c',
              url: '/toddlers',
              name: 'Toddlers',
              type: 'custom',
              uuid: '/toddlers'
            },
            {
              id: 'hanhk3km0m8nt2d',
              url: '/kids',
              name: 'Kids',
              type: 'custom',
              uuid: '/kids'
            },
            {
              id: 'hanhk3km0m8nt2e',
              url: '/teens',
              name: 'Teens',
              type: 'custom',
              uuid: '/teens'
            }
          ]
        },
        {
          id: 'hanhk3km0m8nt2e',
          url: '/page/about-us',
          name: 'About us',
          type: 'custom',
          uuid: '/page/about-us',
          children: []
        }
      ],
      isMain: '1',
      className: ''
    }),
    true
  ];

  await connection.query(query, mainMenu);

  const featuredCategories = [
    'Featured categories',
    'text_block',
    '["homepage"]',
    '["content"]',
    10,
    JSON.stringify({
      text: '[{"id":"r__c13ffd49-f39e-40d7-8d67-d345c0a018c1","size":3,"columns":[{"id":"c__6dffc7a4-4378-4247-8ffd-07d956ce4939","size":1,"data":{"time":1725357550597,"blocks":[{"id":"PjJh9eW0O7","type":"header","data":{"text":"🍼 Toddler Sports Camps","level":3}},{"id":"CHsT6VaRCw","type":"paragraph","data":{"text":"Little Movers Sports Camp Gentle play meets early athletic discovery. Safe, stretchy gear and soft surfaces give tiny athletes the freedom to bounce, tumble, and toddle through a week of fun."}},{"id":"-0lRctONo9","type":"raw","data":{"html":"&lt;a href=\\"/toddlers\\" class=\\"button primary\\"&gt;&lt;span&gt;View toddlers&lt;/span&gt;&lt;/a&gt;"}}],"version":"2.30.2"}},{"id":"c__ca76b2e3-65e3-4eb3-83cb-7ffdfba41208","size":1,"data":{"time":1725357550599,"blocks":[{"id":"2K_v3fp7Dd","type":"header","data":{"text":"🧑 Kids Sports Camps","level":3}},{"id":"XiPHWtWbZm","type":"paragraph","data":{"text":"Junior Champs Weeklong Camp From soccer drills to relay races, this camp fuels big energy with structured play and confidence-building fun. Breathable kits and activewear made for every sprint and splash."}},{"id":"f9KXlEkYmu","type":"raw","data":{"html":"&lt;a href=\\"/kids\\" class=\\"button primary\\"&gt;&lt;span&gt;View kids&lt;/span&gt;&lt;/a&gt;"}}],"version":"2.30.2"}},{"id":"c__2872ebd9-7f79-442b-bade-6c19d74220ef","size":1,"data":{"time":1725357550612,"blocks":[{"id":"mxTqYRjSTw","type":"header","data":{"text":"🧑‍🦱 Teen Sports Camps","level":3}},{"id":"p-frIk8CU-","type":"paragraph","data":{"text":"Next-Level Athletes Program Designed for teens ready to compete, lead, and grow. High-performance gear and pro-inspired sessions for a week of training, team building, and athletic grit."}},{"id":"AoCaoHwyWd","type":"raw","data":{"html":"&lt;a href=\\"/teens\\" class=\\"button primary\\"&gt;&lt;span&gt;Shop teens&lt;/span&gt;&lt;/a&gt;"}}],"version":"2.30.2"}}]}]',
      className: 'page-width'
    }),
    true
  ];

  await connection.query(query, featuredCategories);

  const featuredCamps = [
    'Featured camps',
    'collection_products',
    '["homepage"]',
    '["content"]',
    20,
    JSON.stringify({ count: 4, collection: 'homepage' }),
    true
  ];

  await connection.query(query, featuredCamps);

  const mainBanner = [
    'Main banner',
    'text_block',
    '["homepage"]',
    '["content"]',
    5,
    JSON.stringify({
      text: "[{\"id\":\"r__63dcb2ab-c2a4-40fc-a995-105bf1484b06\",\"size\":1,\"columns\":[{\"id\":\"c__354832f1-6fe1-4845-8cbb-7e094082810e\",\"size\":1,\"data\":{\"time\":1754419107797,\"blocks\":[{\"id\":\"KRtRWBBVvm\",\"type\":\"raw\",\"data\":{\"html\":\"&lt;div style=\\\"height: 500px; margin-top: -3rem; background: linear-gradient(135deg, #aad3ff, #0056b3); display: flex; align-items: center; justify-content: center;\\\"&gt;\\n  &lt;div style=\\\"display: flex; align-items: center; max-width: 1200px; width: 100%; padding: 0 20px;\\\"&gt;\\n    &lt;div style=\\\"flex: 1; text-align: center;\\\"&gt;\\n      &lt;svg width=\\\"300\\\" height=\\\"300\\\" viewBox=\\\"0 0 250 300\\\" fill=\\\"none\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\" style=\\\"fill: #0056b3; color: #0056b3;\\\"&gt;\\n        <path\\n              d=\\\"M200,50 C120,0 40,60 40,146 C40,228 120,290 200,240\\\"\\n              fill=\\\"none\\\"\\n              stroke=\\\"#0056b3\\\"\\n              stroke-width=\\\"48\\\"\\n              stroke-linecap=\\\"round\\\"\\n            />\\n            &lt;line x1=\\\"170\\\" y1=\\\"100\\\" x2=\\\"200\\\" y2=\\\"100\\\" stroke=\\\"#0056b3\\\" stroke-width=\\\"20\\\" stroke-linecap=\\\"round\\\" /&gt;\\n            &lt;line x1=\\\"170\\\" y1=\\\"145\\\" x2=\\\"200\\\" y2=\\\"145\\\" stroke=\\\"#0056b3\\\" stroke-width=\\\"20\\\" stroke-linecap=\\\"round\\\" /&gt;\\n            &lt;line x1=\\\"170\\\" y1=\\\"190\\\" x2=\\\"200\\\" y2=\\\"190\\\" stroke=\\\"#0056b3\\\" stroke-width=\\\"20\\\" stroke-linecap=\\\"round\\\" /&gt;\\n            &lt;line x1=\\\"130\\\" y1=\\\"100\\\" x2=\\\"130\\\" y2=\\\"190\\\" stroke=\\\"#0056b3\\\" stroke-width=\\\"20\\\" stroke-linecap=\\\"round\\\" /&gt;\\n      &lt;/svg&gt;\\n    &lt;/div&gt;\\n    \\n    &lt;div style=\\\"flex: 1; text-align: left; padding: 20px;\\\"&gt;\\n      <h1 style=\\\"font-size: 3.5rem; color: #fff;\\\">Your Heading Here</h1>\\n      &lt;p style=\\\"font-size: 1.5rem; color: #fff; margin: 20px 0;\\\"&gt;Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent ultricies sodales mi, at ornare elit semper ac.&lt;/p&gt;\\n      &lt;a href=\\\"#\\\" style=\\\"display: inline-block; padding: 10px 20px; background-color: #fff; color: #0056b3; text-decoration: none; border-radius: 5px; font-weight: bold;\\\"&gt;SHOP NOW&lt;/a&gt;\\n    &lt;/div&gt;\\n  &lt;/div&gt;\\n&lt;/div&gt;\\n\"}}],\"version\":\"2.31.0-rc.7\"}}]}]",
      className: ''
    }),
    true
  ];

  await connection.query(query, mainBanner);
};
