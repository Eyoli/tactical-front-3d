import Stats from "three/examples/jsm/libs/stats.module"


export const stats = () => {
    let stats: Stats = Stats()
    stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom)

    function animate() {

        stats.begin()

        // monitored code goes here

        stats.end()

        requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
}