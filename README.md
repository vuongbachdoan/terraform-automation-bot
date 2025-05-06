# Terraform Automation Tool Guide

### I. Hardware requirements

- Ubuntu 24.04
- 1vCPU, 1GB RAM (minimum)

### II. Setup Instruction

#### Setup environment

```bash
sudo apt-get update
sudo apt-get install libayatana-appindicator3-1 libwebkit2gtk-4.1-0 libgtk-3-0 --fix-missing
sudo apt --fix-broken install
sudo apt-get update
sudo apt-get upgrade

sudo dpkg --configure amazon-q
```

#### Install Amazon Q Developer (for Ubuntu)
```bash
wget https://desktop-release.q.us-east-1.amazonaws.com/latest/amazon-q.deb
sudo apt-get install -f
sudo dpkg -i amazon-q.deb
q --version
```

#### Login Amazon Q Developer
```bash
q login
```

#### Setup global command
```bash
chmod +x index.js
sudo rm /usr/local/bin/ta
sudo ln -s $(realpath index.js) /usr/local/bin/ta
ta
```

### III. Demo

Here's a quick demo of the tool in action:

{% embed https://youtu.be/BFGhe2YnBs0 %}


### IV. Disclaimer

This project is provided "as is" without any warranty of any kind, either expressed or implied. The authors and contributors are not responsible for any damage, data loss, security issues, or any other consequences resulting from the use, modification, or distribution of this software.

Users are solely responsible for reviewing the code, assessing its suitability for their needs, and implementing appropriate security and compliance measures before use. Contributions are welcomed but may be reviewed and modified as needed.

Use this project at your own risk.