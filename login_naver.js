const logInBtn = document.getElementById("login_btn");
const logOutBtn = document.getElementById("logout_btn");
const userImage = document.getElementById("user_image");
const userName = document.getElementById("user_name");

logInBtn.onclick = () => {
  location.href = "http://localhost:3000/auth/naver";
};

window.onload = async () => {
  try {
    const res = await axios.get("http://localhost:3000/me", {
      withCredentials: true,
    });
    const data = res.data;
    userName.textContent = data.name;
    userImage.src = data.profile_image;
  } catch (err) {
    userName.textContent = "";
    userImage.src = "";
  }
};

logOutBtn.onclick = async () => {
  const res = await axios.post(
    "http://localhost:3000/auth/naver/logout",
    null,
    {
      withCredentials: true,
    }
  );
  location.href = "/";
  console.log(res);
};
