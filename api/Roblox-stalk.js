const fetch = require("node-fetch");

module.exports = {
  name: "Roblox Stalk",
  desc: "Stalk informasi akun Roblox berdasarkan username",
  category: "Stalker",
  path: "/stalker/roblox?username=",

  async run(req, res) {
    try {
      const { username } = req.query;
      if (!username) {
        return res.json({ status: false, error: "Parameter 'username' diperlukan" });
      }

      // Cari user Roblox via API
      const searchRes = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: true })
      });

      const searchData = await searchRes.json();
      if (!searchData.data || searchData.data.length === 0) {
        return res.json({ status: false, error: "User tidak ditemukan di Roblox." });
      }

      const user = searchData.data[0];
      const userId = user.id;

      // Ambil detail profil
      const profileRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
      const profile = await profileRes.json();

      // Ambil avatar
      const avatarRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`);
      const avatarData = await avatarRes.json();
      const avatarUrl = avatarData.data && avatarData.data[0] ? avatarData.data[0].imageUrl : null;

      res.json({
        status: true,
        result: {
          userId,
          name: profile.name,
          displayName: profile.displayName,
          description: profile.description,
          created: profile.created,
          isBanned: profile.isBanned,
          avatar: avatarUrl
        }
      });
    } catch (err) {
      res.status(500).json({ status: false, error: "Gagal mengambil data Roblox", detail: err.message });
    }
  }
};
