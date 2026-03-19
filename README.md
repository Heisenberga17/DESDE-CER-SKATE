# CASA 24 - Skate

A 3D skateboarding game built with Three.js. Ride a skateboard, hit ramps, grind rails, and pull off tricks in a neon-lit skatepark.

---

## How to Run the Game on Windows (Complete Beginner Guide)

This guide assumes you have never installed anything programming-related before. Follow every step exactly as written.

---

### Step 1: Install Node.js

Node.js is a free program that your computer needs to run the game. You only need to install it once.

1. Open your web browser (Chrome, Edge, or Firefox)
2. Go to **https://nodejs.org/**
3. You will see two big green download buttons. Click the one on the **left** that says **"LTS"** (this stands for "Long Term Support" — it's the stable, recommended version)
4. A file called something like `node-v22.x.x-x64.msi` will download. Wait for it to finish
5. Go to your **Downloads** folder and **double-click** the file you just downloaded
6. The Node.js installer will open. Follow these steps exactly:
   - Click **"Next"**
   - Check the box to accept the license agreement, then click **"Next"**
   - Leave the install location as the default (usually `C:\Program Files\nodejs\`), click **"Next"**
   - Leave all features as default, click **"Next"**
   - If you see a page about "Tools for Native Modules" with a checkbox, **leave it unchecked**, click **"Next"**
   - Click **"Install"**
   - If Windows asks "Do you want to allow this app to make changes to your device?", click **"Yes"**
   - Wait for it to finish, then click **"Finish"**
7. **Restart your computer.** This is important — Node.js may not work until you restart.

#### Verify Node.js is installed

After restarting:

1. Press the **Windows key** on your keyboard (the key with the Windows logo, bottom-left of your keyboard)
2. Type **cmd**
3. Click **"Command Prompt"** in the search results (it has a black icon)
4. A black window with white text will appear. This is the Command Prompt
5. Type the following and press **Enter**:

```
node --version
```

6. You should see a version number appear, like `v22.11.0` (the exact numbers may differ)

If you see `v22` or `v20` or any version number, Node.js is installed correctly. Move on to Step 2.

If you see `'node' is not recognized as an internal or external command`, try restarting your computer again. If it still doesn't work after restarting, uninstall Node.js from "Add or remove programs" in Windows Settings and re-do Step 1.

---

### Step 2: Download the Game

#### Option A: You received a .zip file

1. Find the `.zip` file (probably in your Downloads folder)
2. **Right-click** on the `.zip` file
3. Click **"Extract All..."**
4. Choose where you want to extract it. Your **Desktop** is a good choice — click **"Browse"**, select **Desktop**, click **"Select Folder"**
5. Click **"Extract"**
6. You should now have a folder on your Desktop called something like `DESDE-CER-SKATE` or `Skate`
7. **Open the folder** and make sure you can see files like `package.json`, `index.html`, and a `src` folder inside. If instead you see just one more folder inside, open that one too — you need to be in the folder that directly contains `package.json`

#### Option B: You received a link to GitHub

1. Go to the GitHub page in your browser
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Follow the same extraction steps from Option A above

---

### Step 3: Open Command Prompt Inside the Game Folder

This is the most important step. The Command Prompt needs to be "inside" the game folder to work.

#### Method 1 (Easiest):

1. Open the game folder in **File Explorer** (double-click the folder on your Desktop)
2. Make sure you can see the files `package.json` and `index.html` in this folder
3. Click on the **address bar** at the top of the File Explorer window (the bar that shows the folder path, like `C:\Users\YourName\Desktop\DESDE-CER-SKATE`). All the text in it will become selected/highlighted
4. Type **cmd** (this will replace the path text)
5. Press **Enter**
6. A Command Prompt window will open, and it will already be in the correct folder

You'll know you're in the right place because the prompt will show something like:

```
C:\Users\YourName\Desktop\DESDE-CER-SKATE>
```

#### Method 2 (Alternative):

1. Open Command Prompt (press Windows key, type `cmd`, click "Command Prompt")
2. You need to navigate to the game folder. Type `cd ` (the letters c and d, then a space) followed by the full path to your game folder. For example:

```
cd C:\Users\YourName\Desktop\DESDE-CER-SKATE
```

Replace `YourName` with your actual Windows username. Press **Enter**.

**Tip:** If you don't know the exact path, open the game folder in File Explorer, click the address bar, and copy the path. Then in Command Prompt type `cd ` and **right-click** to paste it.

---

### Step 4: Install the Game's Dependencies

Dependencies are extra files the game needs to run. You only need to do this step once (or again if you re-download the game).

1. In the Command Prompt (which should be inside the game folder from Step 3), type:

```
npm install
```

2. Press **Enter**
3. Wait. You will see text scrolling by as it downloads files. This can take **30 seconds to 2 minutes** depending on your internet speed
4. You might see some yellow "WARN" messages — **this is normal, ignore them**
5. When it's done, you'll see a summary line like `added 45 packages in 15s` and your cursor will be ready for a new command

**If you see red "ERR!" messages:**
- Make sure you're in the correct folder (the one with `package.json`). Type `dir` and press Enter to see the files in your current folder. You should see `package.json` in the list
- Make sure you're connected to the internet
- Try running `npm install` again

---

### Step 5: Start the Game

1. In the same Command Prompt window, type:

```
npm run dev
```

2. Press **Enter**
3. After a moment, you'll see output like this:

```
  VITE v8.x.x  ready in 300 ms

  >  Local:   http://localhost:5173/
  >  Network: http://192.168.x.x:5173/
```

4. **Do not close this Command Prompt window!** It needs to stay open while you play. Closing it will stop the game.

---

### Step 6: Open the Game in Your Browser

1. Open **Google Chrome** or **Microsoft Edge** (these work best; avoid Internet Explorer)
2. Click on the address bar at the top of the browser
3. Type exactly:

```
http://localhost:5173
```

4. Press **Enter**
5. The game will load. You should see a character select screen, and then a skater on a skateboard in a neon-lit skatepark

**If you see a blank page**, wait a few seconds for it to load. If it stays blank, press **F12** to open Developer Tools, click the **"Console"** tab, and look for red error messages.

---

### Step 7: Play!

The game is now running. See the **Controls** section below to learn how to play.

---

### Step 8: Stop the Game (When You're Done)

1. Go back to the **Command Prompt** window (it should still be open with the Vite server running)
2. Press **Ctrl + C** on your keyboard (hold the Ctrl key and press C)
3. If it asks `Terminate batch job (Y/N)?`, type **Y** and press **Enter**
4. You can now close the Command Prompt window

---

### Playing Again Later

You don't need to repeat the installation steps. Just:

1. Open the game folder in File Explorer
2. Click the address bar, type `cmd`, press Enter
3. Type `npm run dev` and press Enter
4. Open `http://localhost:5173` in your browser

That's it. Steps 1 and 4 only need to be done once.

---

## Controls

### Keyboard

| Key | What it does |
|-----|-------------|
| `W` | Push forward (accelerate) |
| `S` | Brake / slow down |
| `A` | Steer left |
| `D` | Steer right |
| `Space` | Ollie (jump) |
| `F` | Kickflip (press while in the air) |
| `G` | Heelflip (press while in the air) |
| `H` | Shuvit (press while in the air) |
| `E` | Grind (press when near a rail) |
| `R` | Reset position back to start |

**How to play:**
- Hold **W** to build speed, then press **Space** to jump
- While in the air, press **F**, **G**, or **H** to do flip tricks
- Ride toward a metal rail and press **E** to lock onto it and grind
- Press **Space** while grinding to jump off the rail
- Use ramps to get air — ride up them with speed and you'll launch off the top
- If you get stuck or fall off the map, press **R** to reset

### PS5 / PlayStation Controller

Plug in your controller via USB **before** opening the game page (or refresh the page after plugging it in).

| Input | What it does |
|-------|-------------|
| Left Stick | Steer left/right |
| X (Cross) | Push forward |
| Left Stick Down | Brake |
| Right Stick Flick Up | Ollie (jump) |
| Right Stick Flick Up-Left | Kickflip |
| Right Stick Flick Up-Right | Heelflip |
| Right Stick Flick Left/Right | Shuvit |
| R1 | Grind |
| Triangle | Shuvit |
| Square | Kickflip |
| Circle | Heelflip |
| Options | Reset position |

### Xbox Controller

Xbox controllers work the same as PS5 — the button layout maps automatically:

| Xbox Button | PS5 Equivalent | Action |
|-------------|---------------|--------|
| A | X (Cross) | Push forward |
| Right Stick | Right Stick | Ollie / Tricks |
| RB | R1 | Grind |
| Y | Triangle | Shuvit |
| X | Square | Kickflip |
| B | Circle | Heelflip |
| Menu | Options | Reset |

---

## The Skatepark

The park is divided into multiple zones:

- **Center** — Funbox, launch ramps, grind rails, and a half pipe
- **Northeast Plaza** — Pyramid, manual pads, and ledges
- **Northwest Street** — Stair sets with handrails, flat gaps, and ledges
- **Southeast Bowl** — Four quarter pipes facing inward forming a bowl
- **West Street Plaza** — Long flat rails, kicker ramps, and stairs
- **Far North Park** — Large quarter pipe wall, pyramid, funbox, and manual pads
- **East Mega Bowl** — Large bowl with entry kickers
- **Far South Rail Yard** — Six rails in different configurations, bank ramps
- **Northeast Flow** — Chain of kickers, hip transfers, spine rail
- **Southwest Banks** — Bank-to-bank ramp setup with rail

Explore the whole park! Ride in any direction to find new obstacles.

---

## Troubleshooting

### "node is not recognized as an internal or external command"

Node.js is not installed or your computer needs a restart.
- **Solution:** Restart your computer. If that doesn't fix it, go back to Step 1 and reinstall Node.js.

### "npm is not recognized as an internal or external command"

Same issue as above — npm comes bundled with Node.js.
- **Solution:** Restart your computer. If that doesn't fix it, reinstall Node.js.

### npm install shows red errors

- Make sure you are in the correct folder. In Command Prompt, type `dir` and press Enter. You should see `package.json` in the list of files. If you don't, you're in the wrong folder — go back to Step 3.
- Make sure you are connected to the internet.
- Try running `npm install` again.

### "This site can't be reached" or "localhost refused to connect"

The game server is not running.
- Make sure you ran `npm run dev` and that the Command Prompt is still open.
- Make sure you're going to `http://localhost:5173` (not `https://`, just `http://`).

### The game loads but the screen is black

- Wait a few seconds — it might be loading 3D models.
- Press **R** to reset your position.
- Try refreshing the page with **Ctrl + Shift + R** (this clears the cache and does a full reload).

### The game is slow or choppy

- **Use Chrome or Edge** (not Firefox, Safari, or Internet Explorer).
- Make sure hardware acceleration is on:
  1. In Chrome, go to the address bar and type `chrome://settings/system`
  2. Turn on **"Use graphics acceleration when available"**
  3. Restart Chrome
- Close other browser tabs and heavy programs.
- If you're on a laptop, make sure it's plugged in (battery saver mode reduces GPU performance).

### Controller not working

- Plug in the controller **before** opening the game, or refresh the page after plugging it in.
- Use a **wired USB** connection if Bluetooth is not working.
- Chrome has the best controller support — use Chrome if your controller isn't detected in another browser.
- Try pressing a button on the controller while the game page is focused — some browsers require a button press to activate the gamepad API.

### "Execution Policy" error when running npm

If you see an error about "execution policy" or "scripts are disabled":
1. Close Command Prompt
2. Press the Windows key, type **PowerShell**
3. **Right-click** on "Windows PowerShell" and choose **"Run as administrator"**
4. Type the following and press Enter:
```
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
5. Type **Y** and press Enter to confirm
6. Close PowerShell and go back to Step 3

### Nothing works and I'm stuck

- Make sure your Windows is up to date (Settings > Windows Update)
- Make sure you have a working internet connection
- Try uninstalling Node.js (Settings > Apps > search "Node.js" > Uninstall), restarting your computer, and installing Node.js again from Step 1
- If you're on a school or work computer, your IT department may have restrictions that block Node.js or npm — ask them for help
