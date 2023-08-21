import React, {useState, useEffect} from "react";

import { HashRouter, Switch, Route} from "react-router-dom";

import { css } from '@emotion/css';

import {withAuthenticator} from '@aws-amplify/ui-react';

import { API, Auth, Storage} from 'aws-amplify';

import { listPosts, postsByUser} from './graphql/queries';
import { onCreatePost } from './graphql/subscriptions';

import Header from './Header';
import Button from './Button';
import Posts from './Posts';
import Post from './Post';
import Profile from './Profile';
import CreatePost from './CreatePost';

function Router() {
  const [showOverlay, updateOverlayVisibility] = useState(false);
  const [posts, updatePosts] = useState([]);

  useEffect(() => {
    fetchPosts();
    const subscription = subscribe;
    return () => subscription();
  }, []);

  function subscribe() {
    API.graphql({
        query: onCreatePost
    })
    .subscribe(() => fetchPosts())
  }

  async function fetchPosts(postType = 'all-posts') {
      let postData, newPosts;
      if (postType === 'my-posts') {
          const user = await Auth.currentAuthenticatedUser();
          postData = await API.graphql({
              query: postsByUser,
              variables: {
                  owner: user.username,
                  limit: 100
              }
          });
          newPosts = postData.data.postsByUser.items;
      } else {
          postData = await API.graphql({
              query: listPosts,
              variables: {
                  limit: 100
              }
          });
          newPosts = postData.data.listPosts.items;
      }
      newPosts = await Promise.all(newPosts.map(async post => {
          post.image = await Storage.get(post.image);
          return post;
      }));
      updatePosts(newPosts);
  }
  return ( 
      <>
      <HashRouter>
      <div className = {contentStyle}>
      <Header/>
      <hr className = { dividerStyle }/> 
      <Button title = "New Post"
             onClick = { () => updateOverlayVisibility(true) }/> 
      <Switch>
            <Route exact path = "/">
                <Posts posts = { posts } fetchPosts = {fetchPosts}/> 
            </Route> 
  
            <Route path = "/post/:id">
                <Post/>
            </Route> 
   
            <Route>
                <Profile/>
            </Route> 
      </Switch> 
      </div> 
      </HashRouter> 
      {
          showOverlay && ( 
          <CreatePost updateOverlayVisibility = {
                  updateOverlayVisibility
              }
                  updatePosts = {
                      updatePosts
                  }
              posts = {posts}
              />
          )
      } 
      </>
  );
}

const dividerStyle = css`
    margin-top: 15px;
`
const contentStyle = css`
    min-height: calc(100vh - 45px);
    padding: 0px 40px;
`
export default withAuthenticator(Router);
