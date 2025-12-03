// find.js - Find IDs for extensive legends list

const API_KEY = '48f0f115-020e-4392-9a1e-67ffa6b426fc';

const NBA_TARGETS = [
    // GOATs
    'Michael Jordan', 'Kobe Bryant', 'Shaquille O\'Neal',
    'Magic Johnson', 'Larry Bird', 'Kareem Abdul-Jabbar',
    'Wilt Chamberlain', 'Bill Russell', 'Hakeem Olajuwon',
    'Tim Duncan', 'Kevin Garnett', 'Dirk Nowitzki',
    // 90s/00s Stars
    'Charles Barkley', 'Karl Malone', 'John Stockton',
    'Allen Iverson', 'Steve Nash', 'Dwyane Wade',
    'Patrick Ewing', 'David Robinson', 'Scottie Pippen',
    'Reggie Miller', 'Tracy McGrady', 'Vince Carter',
    // Classic Era
    'Jerry West', 'Oscar Robertson', 'Elgin Baylor',
    'Julius Erving', 'Moses Malone', 'Isiah Thomas'
];

const NFL_TARGETS = [
    // QBs
    'Tom Brady', 'Peyton Manning', 'Joe Montana',
    'Dan Marino', 'John Elway', 'Brett Favre',
    'Drew Brees', 'Aaron Rodgers', 'Steve Young',
    // RBs
    'Barry Sanders', 'Walter Payton', 'Emmitt Smith',
    'Jim Brown', 'LaDainian Tomlinson', 'Adrian Peterson',
    // WRs
    'Jerry Rice', 'Randy Moss', 'Terrell Owens',
    'Calvin Johnson', 'Larry Fitzgerald',
    // Defense
    'Lawrence Taylor', 'Ray Lewis', 'Ed Reed',
    'Deion Sanders', 'Reggie White'
];

async function findPlayers(sport, targets) {
    console.log(`\n🔍 Searching ${sport} players...`);

    // We fetch pages until we find most targets
    // Note: Balldontlie search is fuzzy, we check exact matches
    const found = {};
    let cursor = 0;

    // Safety break after 10 pages to prevent infinite loops
    let pages = 0;

    while (Object.keys(found).length < targets.length && cursor !== null && pages < 15) {
        // Search takes too long paging through everyone. 
        // Better strategy for specific legends: Search by name directly if possible.
        // Actually, balldontlie has a ?search= param. Let's use that for speed!

        // We will switch strategies here to be faster for specific names
        break;
    }

    // Faster Search Strategy: Search name by name
    for (const name of targets) {
        if (found[name]) continue;

        process.stdout.write(`Looking for ${name}... `);
        try {
            const searchName = name.split(' ')[1] || name; // Search by last name usually works best
            const response = await fetch(
                `https://api.balldontlie.io/${sport}/v1/players?search=${encodeURIComponent(name)}`,
                { headers: { 'Authorization': API_KEY } }
            );
            const data = await response.json();

            // Find exact match
            const match = data.data.find(p =>
                `${p.first_name} ${p.last_name}`.toLowerCase() === name.toLowerCase()
            );

            if (match) {
                found[name] = { id: match.id, name: name };
                console.log(`✅ Found ID: ${match.id}`);
            } else {
                console.log(`❌ Not found`);
            }

            await new Promise(r => setTimeout(r, 600)); // Rate limit
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }

    return found;
}

async function main() {
    console.log('🏀🏈 FINDING LEGEND IDs\n');

    // Find NBA
    const nbaPlayers = await findPlayers('nba', NBA_TARGETS);

    // Find NFL
    const nflPlayers = await findPlayers('nfl', NFL_TARGETS);

    // Output formatted for the next script
    console.log('\n' + '═'.repeat(80));
    console.log('📋 COPY THIS INTO importLegends.js:');
    console.log('═'.repeat(80));

    console.log('\nconst NBA_LEGENDS = [');
    NBA_TARGETS.forEach(name => {
        if (nbaPlayers[name]) console.log(`    { id: ${nbaPlayers[name].id}, name: "${name}" },`);
    });
    console.log('];');

    console.log('\nconst NFL_LEGENDS = [');
    NFL_TARGETS.forEach(name => {
        if (nflPlayers[name]) console.log(`    { id: ${nflPlayers[name].id}, name: "${name}" },`);
    });
    console.log('];');
}

main();