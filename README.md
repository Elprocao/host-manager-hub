# Host Manager Hub

Hazme una web que pueda crear hosts de Minecraft directamente en tu PC. Que la propia web, mientras el PC esté encendido, pueda controlar los archivos del propio PC y se puedan modificar de forma remota, pero debe ser una carpeta seleccionada. Crear una carpeta posta para el servidor y que dentro se creen las carpetas necesarias para un servidor de Minecraft. Que se pueda elegir si el servidor va a ser un proxy, el cual redirigirá a los servidores que van a ver, o un servidor como tal. La interfaz de cada servidor, porque cada uno tendrá su propia cuenta, la cual se podrá iniciar sesión con Google para dar acceso, y cada uno podrá crear su propio host desde su PC y él será el dueño de ese host y el que debe añadir usuarios que pueda modificar los archivos dentro de su PC. Ten esto muy claro: que no haya manera de que puedan escalar carpetas para acceder a otros archivos. Bloquea eso completamente.

Hoy a las 18:56

Thought for 9s

Antes de empezar, una limitación importante: una web no puede arrancar un servidor de Minecraft (Java) ni acceder a tu PC por sí sola. Hay dos formas de hacerlo:

Se usaron 2 herramientas

¿Cómo quieres que la web se conecte al PC del dueño?

Solo navegador

¿Qué software de servidor quieres usar?

Elegir por servidor

¿Qué pueden hacer los usuarios que añada el dueño?

Roles

Aparte, que sí se pueda modificar archivos, que sí se pueda encender el servidor. Que haya un archivo para iniciar el servidor, si no estoy mal, se inicia con el "paper", le das doble clic al "paper", que se pueda iniciar el servidor de forma remota ejecutando el archivo que encienda el servidor. Pero eso solo lo puede hacer administradores o el "owner" del propio servidor de forma remota

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bfb61c8e-4962-4781-87b9-19e0c4e357be).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
