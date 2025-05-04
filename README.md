TODO:
- correct AMI

Setup 
```bash
sudo apt-get update
sudo apt-get install libayatana-appindicator3-1 libwebkit2gtk-4.1-0 libgtk-3-0 --fix-missing
sudo apt --fix-broken install
sudo apt-get update
sudo apt-get upgrade

sudo dpkg --configure amazon-q
```

Install Amazon Q Developer (for Ubuntu)
```bash
wget https://desktop-release.q.us-east-1.amazonaws.com/latest/amazon-q.deb
sudo apt-get install -f
sudo dpkg -i amazon-q.deb
q --version
```

Login Amazon Q Developer
```bash
q login
```

Setup global command
```bash
chmod +x index.js
sudo ln -s $(realpath index.js) /usr/local/bin/ta
ta
```