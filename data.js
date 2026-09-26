// Mock data for the booking prototype. Prices mirror the live Urable menu as of 2026-09-26.
window.MINT = (() => {
  const SIZES = {
    car:   { label: 'Car / sedan',              short: 'Car' },
    mid:   { label: 'SUV, truck or minivan',    short: 'SUV / truck' },
    large: { label: 'Large SUV (3rd row)',      short: 'Large SUV' },
    xl:    { label: 'XL truck or van',          short: 'XL' },
  };

  const PACKAGES = [
    { key: 'essentials', name: 'Essentials', scope: 'full', tagline: 'Wash, vacuum, wipe-down, glass',
      price: { car: 179.99, mid: 212.99, large: 269.99, xl: 269.99 },
      includes: ['Full exterior hand wash', 'Bug splatter removal', 'Tires dressed, wheels and wells detailed', 'Compressed-air blowout of cup holders and crevices', 'Dust panels, dash and console, UV protection', 'Interior and exterior windows', 'Door jambs', 'Interior vacuum'] },
    { key: 'deluxe', name: 'Deluxe', scope: 'full', popular: true, tagline: 'Essentials plus shampoo, clay bar and wax',
      price: { car: 244.99, mid: 299.99, large: 379.99, xl: 379.99 },
      includes: ['Everything in Essentials', 'Machine-applied wax', 'Clay bar', 'Carpets and seats shampooed', 'Leather seats exfoliated'] },
    { key: 'superior', name: 'Superior', scope: 'full', tagline: 'Deluxe plus polish and ceramic sealant',
      price: { car: 429.99, mid: 589.99, large: 699.99, xl: 699.99 },
      includes: ['Everything in Deluxe', 'Single-step machine polish and paint enhancement', 'Gtechniq ceramic paint sealant (lasts 3x longer than wax)'] },
    { key: 'interior', name: 'Interior only', scope: 'part', tagline: 'Deluxe-level interior, nothing outside',
      price: { car: 179.99, mid: 212.99, large: 269.99, xl: 269.99 },
      includes: ['Compressed-air blowout', 'Dust panels, dash and console, UV protection', 'Interior windows', 'Door jambs', 'Interior vacuum', 'Carpets and seats shampooed', 'Leather seats exfoliated'] },
    { key: 'exterior', name: 'Exterior only', scope: 'part', tagline: 'Deluxe-level exterior, nothing inside',
      price: { car: 139.99, mid: 189.99, large: 219.99, xl: 244.99 },
      includes: ['Full exterior hand wash', 'Bug removal', 'Tires dressed, wheels and wells', 'Exterior windows', 'Machine-applied wax', 'Clay bar', 'Paint sealant'] },
  ];

  const ADDON_GROUPS = [
    { key: 'removal', name: 'Removals', blurb: 'Things that should not be in the car.',
      items: [
        { key: 'pet_hair', name: 'Pet hair removal', price: 40, blurb: 'Embedded hair pulled from carpet and seats.' },
        { key: 'mold', name: 'Mold removal', price: null, quote: 'Quoted from photos', blurb: 'Full interior detail, shampoo, vents steamed.' },
      ] },
    { key: 'restore', name: 'Restoration and repair', blurb: 'Bring worn parts back.',
      items: [
        { key: 'trim', name: 'Trim restoration', price: 150, blurb: 'Carbon-based coating, up to 24 months.' },
        { key: 'headlight', name: 'Headlight restoration', price: 99, blurb: 'Both headlights, hazing removed.' },
        { key: 'scratch', name: 'Scratch removal', price: 35, from: true, blurb: 'From $35, confirmed from photos.' },
      ] },
    { key: 'deep', name: 'Deep clean and protect', blurb: 'An extra level of care.',
      items: [
        { key: 'carseat', name: "Child's car seat cleaning", price: 30, blurb: 'Steam and vacuum only, no chemicals.' },
        { key: 'leather', name: 'Leather conditioner', price: 40, blurb: 'Restores softness, adds UV protection.' },
        { key: 'sealant', name: 'Ceramic sealant upgrade', price: 60, blurb: 'About 6 months of protection.' },
        { key: 'hot_mess', name: 'Hot mess', price: 40, blurb: 'Extra time for a car that needs it.' },
      ] },
  ];
  const ADDONS = Object.fromEntries(ADDON_GROUPS.flatMap(g => g.items).map(a => [a.key, a]));

  // make -> [[model, size], ...]
  const VEHICLES = {
    Acura: [['ILX','car'],['Integra','car'],['TLX','car'],['RDX','mid'],['MDX','large']],
    Audi: [['A3','car'],['A4','car'],['A5','car'],['A6','car'],['Q3','mid'],['Q5','mid'],['Q7','large'],['Q8','mid'],['e-tron','mid']],
    BMW: [['2 Series','car'],['3 Series','car'],['4 Series','car'],['5 Series','car'],['7 Series','car'],['X1','mid'],['X3','mid'],['X5','mid'],['X7','large'],['i4','car']],
    Buick: [['Encore','mid'],['Envision','mid'],['Enclave','large']],
    Cadillac: [['CT4','car'],['CT5','car'],['XT4','mid'],['XT5','mid'],['XT6','large'],['Escalade','large'],['Lyriq','mid']],
    Chevrolet: [['Malibu','car'],['Camaro','car'],['Corvette','car'],['Bolt','car'],['Trax','mid'],['Equinox','mid'],['Blazer','mid'],['Traverse','large'],['Tahoe','large'],['Suburban','large'],['Colorado','mid'],['Silverado 1500','mid'],['Silverado 2500','xl'],['Express Van','xl']],
    Chrysler: [['300','car'],['Pacifica','mid'],['Voyager','mid']],
    Dodge: [['Charger','car'],['Challenger','car'],['Durango','large'],['Hornet','mid']],
    Ford: [['Mustang','car'],['Fusion','car'],['Escape','mid'],['Bronco Sport','mid'],['Bronco','mid'],['Edge','mid'],['Explorer','large'],['Expedition','large'],['Expedition Max','large'],['Ranger','mid'],['Maverick','mid'],['F-150','mid'],['F-250','xl'],['F-350','xl'],['Transit','xl'],['Transit Connect','mid']],
    Genesis: [['G70','car'],['G80','car'],['GV70','mid'],['GV80','large']],
    GMC: [['Terrain','mid'],['Acadia','large'],['Yukon','large'],['Yukon XL','large'],['Canyon','mid'],['Sierra 1500','mid'],['Sierra 2500','xl'],['Savana','xl']],
    Honda: [['Civic','car'],['Accord','car'],['Fit','car'],['HR-V','mid'],['CR-V','mid'],['Passport','mid'],['Pilot','large'],['Odyssey','mid'],['Ridgeline','mid']],
    Hyundai: [['Elantra','car'],['Sonata','car'],['Ioniq 5','mid'],['Ioniq 6','car'],['Venue','mid'],['Kona','mid'],['Tucson','mid'],['Santa Fe','mid'],['Palisade','large']],
    Infiniti: [['Q50','car'],['QX50','mid'],['QX60','large'],['QX80','large']],
    Jeep: [['Compass','mid'],['Renegade','mid'],['Cherokee','mid'],['Grand Cherokee','mid'],['Grand Cherokee L','large'],['Wrangler','mid'],['Gladiator','mid'],['Wagoneer','large'],['Grand Wagoneer','large']],
    Kia: [['Forte','car'],['K5','car'],['Rio','car'],['Soul','mid'],['Seltos','mid'],['Sportage','mid'],['Sorento','large'],['Telluride','large'],['Carnival','mid'],['EV6','mid'],['Niro','mid']],
    'Land Rover': [['Range Rover Evoque','mid'],['Range Rover Velar','mid'],['Range Rover Sport','mid'],['Range Rover','large'],['Discovery','large'],['Defender','mid']],
    Lexus: [['IS','car'],['ES','car'],['LS','car'],['UX','mid'],['NX','mid'],['RX','mid'],['GX','large'],['LX','large'],['TX','large']],
    Lincoln: [['Corsair','mid'],['Nautilus','mid'],['Aviator','large'],['Navigator','large']],
    Mazda: [['Mazda3','car'],['Mazda6','car'],['MX-5 Miata','car'],['CX-30','mid'],['CX-5','mid'],['CX-50','mid'],['CX-9','large'],['CX-90','large']],
    'Mercedes-Benz': [['A-Class','car'],['C-Class','car'],['E-Class','car'],['S-Class','car'],['GLA','mid'],['GLB','mid'],['GLC','mid'],['GLE','mid'],['GLS','large'],['G-Class','mid'],['Sprinter','xl'],['Metris','xl']],
    Mini: [['Cooper','car'],['Countryman','mid'],['Clubman','car']],
    Mitsubishi: [['Mirage','car'],['Outlander','large'],['Outlander Sport','mid'],['Eclipse Cross','mid']],
    Nissan: [['Versa','car'],['Sentra','car'],['Altima','car'],['Maxima','car'],['Leaf','car'],['Kicks','mid'],['Rogue','mid'],['Murano','mid'],['Pathfinder','large'],['Armada','large'],['Frontier','mid'],['Titan','mid']],
    Porsche: [['911','car'],['Cayman','car'],['Taycan','car'],['Macan','mid'],['Cayenne','mid'],['Panamera','car']],
    Ram: [['1500','mid'],['2500','xl'],['3500','xl'],['ProMaster','xl'],['ProMaster City','mid']],
    Rivian: [['R1T','mid'],['R1S','large']],
    Subaru: [['Impreza','car'],['Legacy','car'],['WRX','car'],['Crosstrek','mid'],['Forester','mid'],['Outback','mid'],['Ascent','large'],['Solterra','mid']],
    Tesla: [['Model 3','car'],['Model S','car'],['Model Y','mid'],['Model X','large'],['Cybertruck','mid']],
    Toyota: [['Corolla','car'],['Camry','car'],['Prius','car'],['Avalon','car'],['Corolla Cross','mid'],['RAV4','mid'],['Venza','mid'],['Highlander','large'],['Grand Highlander','large'],['4Runner','mid'],['Sequoia','large'],['Land Cruiser','mid'],['Sienna','mid'],['Tacoma','mid'],['Tundra','mid']],
    Volkswagen: [['Jetta','car'],['Golf','car'],['Taos','mid'],['Tiguan','mid'],['Atlas','large'],['Atlas Cross Sport','mid'],['ID.4','mid']],
    Volvo: [['S60','car'],['S90','car'],['XC40','mid'],['XC60','mid'],['XC90','large']],
  };
  const VEHICLE_INDEX = Object.entries(VEHICLES).flatMap(([make, models]) =>
    models.map(([model, size]) => ({ make, model, size, key: `${make} ${model}`.toLowerCase() })));

  const POPULAR = ['Toyota Highlander', 'Honda CR-V', 'Ford F-150', 'Tesla Model Y', 'Kia Telluride', 'Toyota Camry'];

  // Zips Mint serves today (intown Atlanta, Decatur, Brookhaven, Buckhead, Vinings, Smyrna,
  // Sandy Springs, Dunwoody, Chamblee, East Point, Hapeville, Marietta, Avondale, Tucker).
  const SERVED = new Set([
    '30002','30021','30030','30032','30033','30079','30084',
    '30303','30305','30306','30307','30308','30309','30310','30311','30312','30313','30314','30315','30316','30317','30318','30319','30324','30326','30327','30328','30329','30331','30336','30337','30338','30339','30340','30341','30342','30344','30345','30350','30354','30360','30363',
    '30080','30082','30060','30062','30064','30066','30067','30068','30346',
  ]);
  // Reachable with a travel fee.
  const EDGE = new Set(['30004','30005','30022','30024','30040','30041','30075','30076','30092','30093','30096','30097','30188','30189','30213','30214','30228','30236','30238','30253','30260','30274','30281','30288','30291','30294','30296','30297','30012','30013','30016','30017','30039','30043','30044','30045','30046','30047','30052','30058','30071','30072','30078','30083','30087','30088','30094']);
  const TRAVEL_FEE = 25;

  const NEIGHBORHOODS = {
    '30030': 'Decatur', '30002': 'Avondale Estates', '30307': 'Candler Park', '30306': 'Virginia-Highland', '30308': 'Midtown', '30309': 'Midtown', '30305': 'Buckhead', '30319': 'Brookhaven', '30338': 'Dunwoody', '30341': 'Chamblee', '30328': 'Sandy Springs', '30339': 'Vinings', '30080': 'Smyrna', '30060': 'Marietta', '30344': 'East Point', '30354': 'Hapeville', '30084': 'Tucker', '30317': 'Kirkwood', '30316': 'East Atlanta', '30312': 'Grant Park', '30318': 'West Midtown', '30310': 'West End',
  };

  const MOCK_ADDRESSES = [
    { line1: '2852 E College Ave', city: 'Decatur', state: 'GA', zip: '30030' },
    { line1: '145 Sycamore St', city: 'Decatur', state: 'GA', zip: '30030' },
    { line1: '404 Church St', city: 'Decatur', state: 'GA', zip: '30030' },
    { line1: '20 N Avondale Rd', city: 'Avondale Estates', state: 'GA', zip: '30002' },
    { line1: '1197 Peachtree St NE', city: 'Atlanta', state: 'GA', zip: '30309' },
    { line1: '675 Ponce De Leon Ave NE', city: 'Atlanta', state: 'GA', zip: '30308' },
    { line1: '3393 Peachtree Rd NE', city: 'Atlanta', state: 'GA', zip: '30326' },
    { line1: '1372 Peachtree St NE', city: 'Atlanta', state: 'GA', zip: '30309' },
    { line1: '2100 Ashford Dunwoody Rd', city: 'Brookhaven', state: 'GA', zip: '30319' },
    { line1: '4400 Ashford Dunwoody Rd', city: 'Dunwoody', state: 'GA', zip: '30346' },
    { line1: '5555 Glenridge Connector', city: 'Sandy Springs', state: 'GA', zip: '30342' },
    { line1: '2800 Cumberland Blvd SE', city: 'Vinings', state: 'GA', zip: '30339' },
    { line1: '1275 Spring St SE', city: 'Smyrna', state: 'GA', zip: '30080' },
    { line1: '500 Powder Springs St', city: 'Marietta', state: 'GA', zip: '30064' },
    { line1: '2757 East Point St', city: 'East Point', state: 'GA', zip: '30344' },
    { line1: '4300 Lavista Rd', city: 'Tucker', state: 'GA', zip: '30084' },
    { line1: '1655 Hardee St NE', city: 'Atlanta', state: 'GA', zip: '30317' },
    { line1: '650 Cherokee Ave SE', city: 'Atlanta', state: 'GA', zip: '30312' },
  ];

  const WINDOWS = [
    { key: 'w8',  label: '8:00 to 10:00 am', start: 8 },
    { key: 'w10', label: '10:00 am to noon', start: 10 },
    { key: 'w12', label: 'Noon to 2:00 pm', start: 12 },
    { key: 'w14', label: '2:00 to 4:00 pm', start: 14 },
    { key: 'w16', label: '4:00 to 6:00 pm', start: 16 },
  ];

  return {
    SIZES, PACKAGES, ADDON_GROUPS, ADDONS, VEHICLES, VEHICLE_INDEX, POPULAR,
    SERVED, EDGE, TRAVEL_FEE, NEIGHBORHOODS, MOCK_ADDRESSES, WINDOWS,
    SAME_DAY_FEE: 30,
    NEW_MEMBER_CREDIT: 20,
    MEMBER_DISCOUNT: { maintenance: 0.15, elite: 0.20 },
    MEMBERSHIP_PRICE: 19.99,
    MULTI_VEHICLE_DISCOUNT: 0.10,
    PREPAY_DISCOUNT: 0.10,
    DEPOSIT_RATE: 0.25,
  };
})();
