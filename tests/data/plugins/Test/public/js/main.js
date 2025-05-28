class Test {
    onLoaded() {
        alert(`Welcome ${this.user}`);
    }

    setConfig(config) {
        this.user = config.user;
    }
}
export default new Test();
