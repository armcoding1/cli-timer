import os from "os";
import path from "path";
import fs from "fs";
import inquirer from "inquirer";
import dotenv from "dotenv";
import readline from "readline"
import socketIOClient from "socket.io-client";
dotenv.config();

const homeDir = os.homedir();
const isWindows = os.type().match(/windows/i);
const sessionFileName = path.join(homeDir, `${isWindows ? "_" : "."}sb-timers-session`);
const SERVER = process.env.SERVER;

let socket = null;
let timersData = [];

const initializeSocket = () => {
  socket = socketIOClient(SERVER, {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });

  socket.on('timer_update', (data) => {
    timersData = data;
  });
};

const signup = async () => {
  const { name, password } = await inquirer.prompt([
    { type: 'input', name: 'name', message: 'Name:' },
    { type: 'password', name: 'password', message: 'Password:' }
  ]);
  try {
    socket.emit('signup', { name, password }, (response) => {
      if (response.error) {
        console.error("Error signing up:", response.error);
      } else {
        console.log('Signed up successfully!', response);
      }
    });
  } catch (error) {
    console.error("Error signing up:", error.message);
  }
};

const login = async () => {
  const { name, password } = await inquirer.prompt([
    { type: 'input', name: 'name', message: 'Name:' },
    { type: 'password', name: 'password', message: 'Password:' }
  ]);
  try {
    socket.emit('login', { name, password }, (response) => {
      if (response.error) {
        console.error("Error logging in:", response.error);
      } else {
        const { userId, token } = response;
        console.log('Logged in successfully!');

        const userData = { token, userId };
        fs.writeFileSync(sessionFileName, JSON.stringify(userData));
        console.log('Token saved to session file:', sessionFileName);

        socket.emit('authenticate', { token });
      }
    });
  } catch (error) {
    console.error("Error logging in:", error.message);
  }
};

const logout = async () => {
  try {
    socket.emit('logout', {}, (response) => {
      console.log('Logged out successfully!');
      if (fs.existsSync(sessionFileName)) {
        fs.unlinkSync(sessionFileName);
      }
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    });
  } catch (error) {
    console.error('Error logging out:', error.message);
  }
};

const startTimer = async (timerName) => {
  const sessionFileData = JSON.parse(fs.readFileSync(sessionFileName, "utf-8"));
  const { userId } = sessionFileData;

  try {
    socket.emit('start_timer', { timerName, userId }, (response) => {
      if (response.error) {
        console.error("Error starting timer:", response.error);
      } else {
        console.log("Timer started successfully:", response.message);
      }
    });
  } catch (error) {
    console.error("Error starting timer:", error.message);
  }
};

const stopTimer = async (timerId) => {
  try {
    socket.emit('stop_timer', { timerId }, (response) => {
      if (response.error) {
        console.error("Error stopping timer:", response.error);
      } else {
        console.log(response.message);
      }
    });
  } catch (error) {
    console.error("Error stopping timer:", error.message);
  }
};

const getStatus = async () => {
  try {
    if (!timersData || !timersData.timers || timersData.timers.length === 0) {
      console.log("No timers found.");
      return;
    }

    const updateSeconds = () => {
      timersData.timers.forEach((timer) => {
        if (!timer.stopped) {
          const [hours, minutes, seconds] = timer.formattedTime.split(":").map(Number);
          const totalSeconds = hours * 3600 + minutes * 60 + seconds + 1;
          const updatedSeconds = totalSeconds % 60;
          timer.formattedTime = `${Math.floor(totalSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0')}:${updatedSeconds.toString().padStart(2, '0')}`;
        }
      });
    };

    const printTimers = () => {
        const timersString = timersData.timers.map((timer) => {
            if (timer.stopped) {
                return `ID: ${timer.id}, Task: ${timer.task}, Stopped: ${timer.stopped}`;
            } else {
                return `ID: ${timer.id}, Task: ${timer.task}, Time: ${timer.formattedTime}`;
            }
        }).join(", ");
    
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write("Current timers: " + timersString);
    };
    
    printTimers();
    setInterval(() => {
        updateSeconds();
        printTimers();
    }, 1000);
  
    timersData.timers.forEach((timer) => {
      if (timer.stopped) {
        console.log(`ID: ${timer.id}, Task: ${timer.task}, Stopped: ${timer.stopped}`);
      } else {
        console.log(`ID: ${timer.id}, Task: ${timer.task}, Time: ${timer.formattedTime}`);
      }
    });
  } catch (error) {
    console.error("Error getting status:", error.message);
  }
};

const main = async () => {
  initializeSocket();
  while (true) {
    const sessionFileExists = fs.existsSync(sessionFileName);
    const isLoggedIn = sessionFileExists ? JSON.parse(fs.readFileSync(sessionFileName, "utf-8")) : null;

    const { command } = await inquirer.prompt([
      {
        type: 'list',
        name: 'command',
        message: 'Choose a command:',
        choices: [
          { name: 'Signup', value: 'signup' },
          { name: 'Login', value: 'login' },
          { name: 'Logout', value: 'logout', disabled: !isLoggedIn },
          { name: 'Start Timer', value: 'start', disabled: !isLoggedIn },
          { name: 'Stop Timer', value: 'stop', disabled: !isLoggedIn },
          { name: 'Get Status', value: 'status', disabled: !isLoggedIn },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    switch (command) {
      case 'signup':
        await signup();
        break;
      case 'login':
        await login();
        break;
      case 'logout':
        await logout();
        break;
      case 'start':
        const { timerName } = await inquirer.prompt([
          { type: 'input', name: 'timerName', message: 'Enter timer name:' }
        ]);
        await startTimer(timerName);
        break;
      case 'stop':
        const { timerId } = await inquirer.prompt([
          { type: 'input', name: 'timerId', message: 'Enter timer ID to stop:' }
        ]);
        await stopTimer(timerId);
        break;
      case 'status':
        await getStatus();
        break;
      case 'exit':
        process.exit(0);
      default:
        console.log('Unknown command.');
    }
  }
};

main();
