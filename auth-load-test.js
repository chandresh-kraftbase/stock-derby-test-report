import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';


export const options = {
  vus: 1,
  iterations: 1
};

const BASE_URL = "http://168.119.150.101/api";


export default function () {
  const userData = generateUser();

  const registrationPayload = JSON.stringify(userData);
  const registrationParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const registrationResponse = http.post(`${BASE_URL}/user`, registrationPayload, registrationParams);

  check(registrationResponse, {
    'registration status is 201': (r) => r.status === 201,
    'registration response has user id and otp': (r) => {
      const body = JSON.parse(r.body);
      return body.id !== undefined && body.otp !== undefined;
    }
  });


  const registrationBody = JSON.parse(registrationResponse.body);
  const userId = registrationBody.id;
  const otp = registrationBody.otp;

  const otpVerificationPayload = JSON.stringify({
    userId: userId,
    otp: otp
  });

  const otpVerificationParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const otpVerificationResponse = http.post(`${BASE_URL}/user/verify/${userId}`, otpVerificationPayload, otpVerificationParams);

  check(otpVerificationResponse, {
    'OTP verification status is 200': (r) => r.status === 200,
    'OTP verification successful': (r) => {
      const body = JSON.parse(r.body);
      return body.message == "User verified successfully";
    }
  });


  const loginPayload = JSON.stringify({
    username: userData.email,
    password: userData.password
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginResponse = http.post(`${BASE_URL}/auth/user-login`, loginPayload, loginParams);

  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'auth token present in HTTP-only cookie': (r) => {
      const cookies = r.headers['Set-Cookie'] || [];
      const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
      return cookieArray.some(cookie =>
        cookie.includes('auth_token') &&
        cookie.includes('HttpOnly')
      );
    }
  });
}

function generateRandomPassword(length = 12) {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const password = [
    uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)],
    lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)],
    numberChars[Math.floor(Math.random() * numberChars.length)],
    specialChars[Math.floor(Math.random() * specialChars.length)]
  ];

  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  for (let i = password.length; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}


function generateUser() {
  return {
    firstname: `First${randomString(6)}`,
    lastname: `Last${randomString(6)}`,
    username: `user_${randomString(10)}`,
    email: `${randomString(10)}@example.com`,
    phone: '+919518196127',
    password: generateRandomPassword(),
    company: 4
  };
}
