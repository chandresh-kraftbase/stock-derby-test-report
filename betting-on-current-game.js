import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 600,
    iterations: 600,
    duration: '1s',
};

const BASE_URL = "http://168.119.150.101/api";
const PASSWORD = "IamChanp@22";
const users = JSON.parse(open('./users.json'));

const PlacementType = {
    SINGLE: "single",
    SPLIT: "split",
    QUARTER: "quarter",
    STREET: "street",
    DOUBLE_STREET: "double_street",
    CORNER: "corner",
    COLUMN: "column",
    COLOR: "color",
    EVEN_ODD: "even_odd",
    HIGH_LOW: "high_low",
};

export default function () {
    const user = users[Math.floor(Math.random() * users.length)];

    const loginPayload = JSON.stringify({
        username: user.email??user.username,
        password: PASSWORD,
    });

    const loginParams = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const loginResponse = http.post(`${BASE_URL}/auth/user-login`, loginPayload, loginParams);

    const loginSuccess = check(loginResponse, {
        'login status is 200': (r) => r.status === 200,
        'auth token present in HTTP-only cookie': (r) => {
            const cookies = r.headers['Set-Cookie'] || [];
            const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
            return cookieArray.some(cookie =>
                cookie.includes('auth_token') &&
                cookie.includes('HttpOnly')
            );
        },
    });

    if (!loginSuccess) {
        console.error('Login failed!');
        console.error(`Response: ${loginResponse.body}`);
        console.error(`User: ${loginPayload}`);
        return;
    }
    sleep(1);

    let cookies = loginResponse.headers['Set-Cookie'];
    cookies = Array.isArray(cookies) ? cookies : [cookies];

    const authTokenCookie = cookies.find(cookie => cookie.includes('auth_token'));

    if (!authTokenCookie) {
        console.error('Auth token cookie not found!');
        return;
    }

    const roundRecordsParams = {
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authTokenCookie,
        },
        params: {
            type: 'CRYPTO',
            limit: 1,
            startTime: new Date().toISOString(),
            page: 1,
        },
    };

    const roundRecordsResponse = http.get(`${BASE_URL}/round-records`, roundRecordsParams);

    const recordsSuccess = check(roundRecordsResponse, {
        'round records status is 200': (r) => r.status === 200,
        'round records response is not empty': (r) => {
            const body = JSON.parse(r.body);
            return body.roundRecords && body.roundRecords.length > 0;
        },
    });

    if (!recordsSuccess) {
        console.error('Round records request failed!');
        console.log(`Request: ${JSON.stringify(roundRecordsParams.params)}`);
        return;
    }

    const roundRecords = JSON.parse(roundRecordsResponse.body).roundRecords;
    const roundRecord = roundRecords[0];

    const markets = roundRecord.market;
    if (!markets || markets.length < 2) {
        console.error('Insufficient markets available for betting!');
        return;
    }


    // Select two random market IDs for the STREET bet
    const selectedMarkets = markets.slice(0, 2).map(market => market.id);

    const chip = {
        amount: Math.floor(Math.random() * 100) + 1, // Random amount between 1 and 100
        type: PlacementType.SPLIT, // STREET placement type
    };

    const betPayload = JSON.stringify({
        amount: chip.amount,
        round: roundRecord.id,
        placementType: chip.type,
        market: selectedMarkets, // Pass an array of market IDs
    });

    const betParams = {
        headers: {
            'Content-Type': 'application/json',
            'Cookie': authTokenCookie,
        },
    };

    sleep(1);


    const betResponse = http.post(`${BASE_URL}/game-records`, betPayload, betParams);

    const betSuccess = check(betResponse, {
        'bet status is 200': (r) => r.status === 200
    });

    if (!betSuccess) {
        console.error('Betting failed!');
        console.error(`Response: ${betResponse.body}`);
        console.error(`authTokenCookie: ${authTokenCookie}`);
    }

}
