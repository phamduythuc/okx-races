const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class OKX {
    headers() {
        return {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en;q=0.9",
            "App-Type": "web",
            "Content-Type": "application/json",
            "Origin": "https://www.okx.com",
            "Referer": "https://www.okx.com/mini-app/racer?tgWebAppStartParam=linkCode_85298986",
            "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Microsoft Edge";v="126", "Microsoft Edge WebView2";v="126"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
            "X-Cdn": "https://www.okx.com",
            "X-Locale": "en_US",
            "X-Utc": "7",
            "X-Zkdex-Env": "0"
        };
    }

    async postToOKXAPI(extUserId, extUserName) {
        const url = `https://www.okx.com/priapi/v1/affiliate/game/racer/info?t=${Date.now()}`;
        const headers = this.headers();
        const payload = {
            "extUserId": extUserId,
            "extUserName": extUserName,
            "gameId": 1,
            "linkCode": "85298986"
        };

        return axios.post(url, payload, { headers });
    }

    async assessPrediction(extUserId, predict) {
        const url = `https://www.okx.com/priapi/v1/affiliate/game/racer/assess?t=${Date.now()}`;
        const headers = this.headers();
        const payload = {
            "extUserId": extUserId,
            "predict": predict,
            "gameId": 1
        };

        return axios.post(url, payload, { headers });
    }

    async checkDailyRewards(extUserId) {
        const url = `https://www.okx.com/priapi/v1/affiliate/game/racer/tasks?extUserId=${extUserId}&t=${Date.now()}`;
        const headers = this.headers();
        try {
            const response = await axios.get(url, { headers });
            const tasks = response.data.data;
            const dailyCheckInTask = tasks.find(task => task.id === 4);
            if (dailyCheckInTask) {
                if (dailyCheckInTask.state === 0) {
                    this.log('Bắt đầu checkin...');
                    await this.performCheckIn(extUserId, dailyCheckInTask.id);
                } else {
                    this.log('Hôm nay bạn đã điểm danh rồi!');
                }
            }
        } catch (error) {
            this.log(`Lỗi kiểm tra phần thưởng hàng ngày: ${error.message}`);
        }
    }

    async performCheckIn(extUserId, taskId) {
        const url = `https://www.okx.com/priapi/v1/affiliate/game/racer/task?t=${Date.now()}`;
        const headers = this.headers();
        const payload = {
            "extUserId": extUserId,
            "id": taskId
        };

        try {
            await axios.post(url, payload, { headers });
            this.log('Điểm danh hàng ngày thành công!');
        } catch (error) {
            this.log(`Lỗi rồi: ${error.message}`);
        }
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Đã hoàn thành tất cả tài khoản, chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async Countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[*] Chờ ${i} giây để tiếp tục...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async main() {
        const dataFile = path.join(__dirname, 'id.txt');
        const userData = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < userData.length; i++) {
                const [extUserId, extUserName] = userData[i].split('|');
                try {
                    console.log(`========== Tài khoản ${i + 1} | ${extUserName} ==========`.blue);
                    await this.checkDailyRewards(extUserId);
                    for (let j = 0; j < 50; j++) {
                        const response = await this.postToOKXAPI(extUserId, extUserName);
                        const balancePoints = response.data.data.balancePoints;
                        this.log(`${'Balance Points:'.green} ${balancePoints}`);

                        const predict = 1;
                        const assessResponse = await this.assessPrediction(extUserId, predict);
                        const assessData = assessResponse.data.data;
                        const result = assessData.won ? 'Win'.green : 'Thua'.red;
                        const calculatedValue = assessData.basePoint * assessData.multiplier;
                        this.log(`Kết quả: ${result} x ${assessData.multiplier}! Balance: ${assessData.balancePoints}, Nhận được: ${calculatedValue}, Giá cũ: ${assessData.prevPrice}, Giá hiện tại: ${assessData.currentPrice}`.magenta);
                        if (assessData.numChance > 1) {
                            await this.Countdown(5);
                            continue;
                        } else if (assessData.secondToRefresh > 0) {
                            await this.Countdown(assessData.secondToRefresh + 5);
                        } else {
                            break;
                        }
                    }
                } catch (error) {
                    this.log(`${'Lỗi rồi:'.red} ${error.message}`);
                }
            }
            await this.waitWithCountdown(60);
        }
    }
}

if (require.main === module) {
    const okx = new OKX();
    okx.main().catch(err => {
        console.error(err.toString().red);
        process.exit(1);
    });
}