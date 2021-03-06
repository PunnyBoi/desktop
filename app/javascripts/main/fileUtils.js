var {ipcMain, remote, dialog, app} = require('electron');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
var request = require("request");
var appPath = app.getPath('userData');

class FileUtils {

  readJSONFile(path, callback) {
    fs.readFile(path, 'utf8', function (err, data) {
      if(err) {
        console.log("ERROR READING JSON FILE", path);
        callback(null, err);
        return;
      }
      var obj = JSON.parse(data);
      callback(obj);
    });
  }

  writeJSONFile(data, path, callback) {
    this.ensureDirectoryExists(path);
    fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8', (err) => {
      callback(err);
    });
  }

  deleteAppRelativeDirectory(relativePath) {
    console.log("Delete App Relative Directory", relativePath);
    let deleteDirectory = (dir_path) => {
      if (fs.existsSync(dir_path)) {
        fs.readdirSync(dir_path).forEach((entry) => {
          var entry_path = path.join(dir_path, entry);
          if (fs.lstatSync(entry_path).isDirectory()) {
            deleteDirectory(entry_path);
          } else {
            fs.unlinkSync(entry_path);
          }
        });
        fs.rmdirSync(dir_path);
      }
    }

    deleteDirectory(path.join(appPath, relativePath));
  }

  ensureDirectoryExists(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    this.ensureDirectoryExists(dirname);
    fs.mkdirSync(dirname);
  }

  downloadFile(url, filePath, callback) {
    this.ensureDirectoryExists(filePath);

    // null callback after calliing because multiple '.on' could be called

    request(url)
      .on('error', function (err) {
        console.log('File download error', url,  err);
        callback && callback()
        callback = null;
      })
      .on('response', function(response) {
        if(response.statusCode !== 200) {
          console.log("File download not 200", url);
          callback && callback(response);
          callback = null;
        }
      })
      .pipe(fs.createWriteStream(filePath))
      .on('close', function() {
        console.log('File download success', url);
        callback && callback(null)
        callback = null;
      });
  }

  copyFileSync(source, target) {
    var targetFile = target;

    //if target is a directory a new file with the same name will be created
    if(fs.existsSync(target)) {
      if(fs.lstatSync(target).isDirectory()) {
        targetFile = path.join(target, path.basename(source));
      }
    }

    fs.writeFileSync(targetFile, fs.readFileSync(source));
  }

  copyFolderRecursiveSync(source, target, addBase) {
    // console.log("copyFolderRecursiveSync", source, target);
    var files = [];

    // Check if folder needs to be created or integrated
    var targetFolder = addBase ? path.join(target, path.basename(source)) : target;
    if(!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder);
    }

    // Copy
    if (fs.lstatSync(source).isDirectory()) {
      files = fs.readdirSync(source);
      files.forEach((file) => {
        var curSource = path.join(source, file);
        if(fs.lstatSync(curSource).isDirectory()) {
          this.copyFolderRecursiveSync(curSource, targetFolder, true);
        } else {
          this.copyFileSync(curSource, targetFolder);
        }
      });
    }
  }

}

export default new FileUtils();
