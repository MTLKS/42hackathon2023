# mongodb

readonly bin_path="$HOME/goinfre"

function install_mongodb() {
  local version="7.0.2"
  local package="mongodb-macos-x86_64-$version"
  local tgz="$package.tgz"

  curl -O "https://fastdl.mongodb.org/osx/$tgz" &&
  tar -vxf "$tgz" &&
  mv "$package/bin/mongod" "$bin_path/mongodb" &&
  rm -rf "$package" "$tgz" &&
  echo "mongod is installed to $bin_path/mongodb"
}

# compass
function install_compass() {
  version="1.40.4"
  package="mongodb-compass-$version-darwin-x64"
  dmg="$package.dmg"
  if [ ! -d "$package" ] && [ ! -f "$dmg" ]; then
    curl -O "https://downloads.mongodb.com/compass/$dmg"
    echo "Compass is installed as .dmg file. Please extract it manually."
  fi
}

# mongosh
function install_mongosh() {
  local version="2.0.2"
  local package="mongosh-$version-darwin-x64"
  local zip="$package.zip"


  curl -O "https://downloads.mongodb.com/compass/$zip" &&
  unzip "$zip" &&
  mv "$package/bin/mongosh" "$bin_path/mongosh" &&
  rm -rf "$package" "$zip" &&
  echo "mongosh is installed to $bin_path/mongosh"
}
