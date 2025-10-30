const fetch = require("node-fetch");

module.exports = {
  name: "Minecraft Stalk",
  desc: "Stalk informasi akun Minecraft berdasarkan username",
  category: "Stalker",
  path: "/stalker/minecraft?username=",

  async run(req, res) {
    try {
      const { username } = req.query;
      if (!username) {
        return res.json({ status: false, error: "Parameter 'username' diperlukan" });
      }

      // Cari UUID dari username via Mojang API
      const uuidRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
      if (uuidRes.status === 204) {
        return res.json({ status: false, error: "User Minecraft tidak ditemukan." });
      }

      const uuidData = await uuidRes.json();
      const uuid = uuidData.id;

      // Ambil data profil lengkap (skin & cape)
      const profileRes = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);
      const profileData = await profileRes.json();

      let skinUrl = null;
      let capeUrl = null;

      if (profileData.properties && profileData.properties.length > 0) {
        const textures = JSON.parse(Buffer.from(profileData.properties[0].value, 'base64').toString());
        if (textures.textures.SKIN) skinUrl = textures.textures.SKIN.url;
        if (textures.textures.CAPE) capeUrl = textures.textures.CAPE.url;
      }

      res.json({
        status: true,
        result: {
          uuid,
          name: uuidData.name,
          skin: skinUrl,
          cape: capeUrl
        }
      });
    } catch (err) {
      res.status(500).json({ status: false, error: "Gagal mengambil data Minecraft", detail: err.message });
    }
  }
};
